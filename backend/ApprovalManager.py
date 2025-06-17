# src/ApprovalManager.py

import asyncio
import json
import uuid
from collections import OrderedDict
from typing import Any, Callable, Coroutine, Dict, List, Optional

from fastapi import WebSocket
from pydantic import BaseModel

# --- Pydantic models for chat structure ---
class QuestionPayload(BaseModel):
    id: str
    text: str
    type: str = "free_text"
    options: Optional[List[str]] = None

class ChatMessage(BaseModel):
    author: str # 'user' or 'server'
    text: str

class ApprovalManager:
    """Manages the state of pending approvals, questions, and chat history."""

    def __init__(self):
        # Stores pending tool call approvals: {call_id: {"details": ..., "event": ...}}
        self._pending_approvals: Dict[str, Dict[str, Any]] = OrderedDict()
        self._call_log: List[Dict[str, Any]] = []

        # --- NEW: Chat and Question State ---
        self._active_connections: List[WebSocket] = []
        self._chat_history: List[Dict[str, Any]] = []
        # Stores pending questions: {question_id: {"event": ..., "response": ...}}
        self._pending_questions: Dict[str, Dict[str, Any]] = {}


    async def broadcast(self, message: Dict):
        """Send a message to all connected WebSocket clients."""
        # A simple fix for non-serializable objects like asyncio.Event
        def default_serializer(o):
            if isinstance(o, (asyncio.Event,)):
                return f"<{type(o).__name__}>"
            raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

        message_str = json.dumps(message, default=default_serializer)
        for connection in self._active_connections:
            await connection.send_text(message_str)

    async def add_connection(self, websocket: WebSocket):
        """Register a new WebSocket connection."""
        await websocket.accept()
        self._active_connections.append(websocket)
        # Send current state to newly connected client
        initial_state = {
            "type": "initial_state",
            "payload": {
                "pending": list(self._pending_approvals.values()),
                "log": self._call_log,
                # --- NEW: Send chat history on connect ---
                "chatHistory": self._chat_history,
            },
        }
        await self.broadcast(initial_state)

    def remove_connection(self, websocket: WebSocket):
        """Remove a disconnected WebSocket connection."""
        self._active_connections.remove(websocket)

    # --- NEW: Methods for Chat Functionality ---

    def get_chat_history(self) -> List[Dict[str, Any]]:
        """Gets the entire chat history."""
        return self._chat_history

    async def ask_question(self, text: str, options: Optional[List[str]] = None) -> str:
        """
        Asks a question to the user via the UI and waits for a response.
        This function is awaitable and will pause execution until the user replies.
        """
        question_id = f"q_{uuid.uuid4()}"
        response_event = asyncio.Event()

        self._pending_questions[question_id] = {
            "event": response_event,
            "response": None,  # This will be filled by the user's response
        }

        question_type = "multiple_choice" if options else "free_text"
        question_payload = QuestionPayload(
            id=question_id, text=text, type=question_type, options=options
        )

        # Add the question to chat history and broadcast it
        self._chat_history.append(ChatMessage(author="server", text=text).model_dump())
        await self.broadcast({"type": "new_question", "payload": question_payload.model_dump()})

        print(f"Asking question ({question_id}): '{text}'... waiting for user response.")
        
        # Wait here until the user responds via the WebSocket
        await response_event.wait()

        # Retrieve the response, clean up, and return
        response_data = self._pending_questions.pop(question_id)
        user_response = response_data["response"]

        print(f"Received response for question ({question_id}): '{user_response}'")
        return user_response
    
    
    async def tell_user(self, message: str):
        """
        Sends a message to the user, marking it as a message from the server.
        """
        self._chat_history.append(ChatMessage(author="server", text=message).model_dump())
        await self.broadcast({"type": "new_message", "payload": {"author": "server", "text": message}})
    async def handle_user_response(self, payload: Dict[str, Any]):
        """
        Handles a user response received from the WebSocket.
        This sets the event for the corresponding pending question.
        """
        question_id = payload.get("question_id")
        user_text = payload.get("text")

        if not question_id or question_id not in self._pending_questions:
            # Maybe the question timed out or was already answered
            print(f"Received response for an unknown or expired question_id: {question_id}")
            return

        # Log the user's message to history
        user_message = ChatMessage(author="user", text=user_text)
        self._chat_history.append(user_message.model_dump())
        
        # Broadcast the user's message so all clients see it
        await self.broadcast({"type": "new_chat_message", "payload": user_message.model_dump()})
        
        # Store the response and set the event to unblock `ask_question`
        self._pending_questions[question_id]["response"] = user_text
        self._pending_questions[question_id]["event"].set()
        
        # Notify clients the question is resolved
        await self.broadcast({"type": "question_resolved", "payload": {"id": question_id}})


    # --- Existing Tool Call Methods ---
    
    def get_tool_calls(self, count: int) -> List[Dict[str, Any]]:
        """Gets the most recent tool calls, up to the given count."""
        # This now needs to return a more complex structure for the initial load
        return {
            "pending": list(self._pending_approvals.values()),
            "log": self._call_log[-count:][::-1]
        }
    
    async def request_approval(self, func: Callable[..., Coroutine], args: tuple, kwargs: dict, renderer: str):
        call_id = str(uuid.uuid4())
        tool_name = func.__name__
        approval_event = asyncio.Event()

        request_details = {
            "id": call_id,
            "tool_name": tool_name,
            "args": list(args),
            "kwargs": kwargs,
            "renderer": renderer,
            "status": "pending",
        }

        self._pending_approvals[call_id] = {
            "details": request_details,
            "event": approval_event,
        }

        print(f"Tool call '{tool_name}' ({call_id}) is pending approval.")
        log_entry_pending = {**request_details, "status": "pending"}
        self._call_log.append(log_entry_pending)
        await self.broadcast({"type": "new_request", "payload": request_details})

        try:
            await approval_event.wait()
            # Check if it was denied while waiting
            log_entry = next((log for log in reversed(self._call_log) if log["id"] == call_id), None)
            if log_entry and log_entry.get("status") == "denied":
                 raise RuntimeError(f"Tool call '{tool_name}' ({call_id}) was denied.")
        except Exception:
            # The denial is now handled in the deny method, this is a safety net
            denial_message = f"Tool call '{tool_name}' ({call_id}) was denied or cancelled."
            print(denial_message)
            return denial_message # Propagate the error message

        print(f"Tool call '{tool_name}' ({call_id}) was approved. Executing.")
        # Retrieve potentially modified kwargs
        approved_call = next((call for call in self._call_log if call["id"] == call_id), None)
        if approved_call:
            kwargs = approved_call.get("kwargs", kwargs)
            
        result = await func(*args, **kwargs)

        log_entry = next((log for log in self._call_log if log["id"] == call_id), None)
        if log_entry:
            log_entry["status"] = "approved_and_executed"
        
        await self.broadcast({
            "type": "request_approved",
            "payload": {"id": call_id, "result": str(result)},
        })
        return result

    async def approve(self, call_id: str, modifications: Dict[str, Any] = None):
        """Approve a pending tool call, potentially with modifications."""
        if call_id in self._pending_approvals:
            # Update kwargs in the log if modifications are provided
            if modifications:
                log_entry = next((call for call in self._call_log if call["id"] == call_id), None)
                if log_entry:
                    log_entry["kwargs"].update(modifications)
                    # Broadcast the update so the UI can reflect it if needed (optional)
                    # await self.broadcast({"type": "log_update", "payload": log_entry})
            
            approval = self._pending_approvals.pop(call_id)
            approval["event"].set()
            return True
        return False

    async def deny(self, call_id: str):
        """Deny a pending tool call."""
        if call_id in self._pending_approvals:
            print(f"Tool call '{call_id}' was denied by user.")
            
            # Update the log status first
            log_entry = next((log for log in reversed(self._call_log) if log["id"] == call_id), None)
            if log_entry:
                log_entry["status"] = "denied"

            # Pop and set the event to unblock the waiting function
            approval = self._pending_approvals.pop(call_id)
            approval["event"].set()

            # Notify UI
            await self.broadcast({
                "type": "request_denied",
                "payload": {"id": call_id},
            })
            return True
        return False

approval_manager = ApprovalManager()