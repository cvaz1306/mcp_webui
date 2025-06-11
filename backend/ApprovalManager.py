# --- 1. Approval Management System ---

from fastapi import WebSocket


import asyncio
import json
import uuid
from collections import OrderedDict
from typing import Any, Callable, Coroutine, Dict, List


class ApprovalManager:
    """Manages the state of pending and processed tool calls."""

    def __init__(self):
        # Stores pending approvals: {call_id: {"details": ..., "event": ...}}
        self._pending_approvals: Dict[str, Dict[str, Any]] = OrderedDict()
        self._active_connections: List[WebSocket] = []
        self._call_log: List[Dict[str, Any]] = []

    def get_tool_calls(self, count: int) -> List[Dict[str, Any]]:
        """Gets the most recent tool calls, up to the given count."""
        return self._call_log[-count:][::-1]
    
    async def broadcast(self, message: Dict):
        """Send a message to all connected WebSocket clients."""
        for connection in self._active_connections:
            await connection.send_text(json.dumps(message))

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
            },
        }
        # Serialize the Event objects before sending
        state_str = json.dumps(initial_state, default=lambda o: "<Event>")
        await websocket.send_text(state_str)

    def remove_connection(self, websocket: WebSocket):
        """Remove a disconnected WebSocket connection."""
        self._active_connections.remove(websocket)

    async def request_approval(
        self,
        func: Callable[..., Coroutine],
        args: tuple,
        kwargs: dict,
        renderer: str,
    ):
        """Queue a tool call for approval and wait for it to be approved."""
        call_id = str(uuid.uuid4())
        tool_name = func.__name__
        approval_event = asyncio.Event()

        request_details = {
            "id": call_id,
            "tool_name": tool_name,
            "args": args,
            "kwargs": kwargs,
            "renderer": renderer,
            "status": "pending",
        }

        self._pending_approvals[call_id] = {
            "details": request_details,
            "event": approval_event,
        }

        # Log the request and notify UI
        print(f"Tool call '{tool_name}' ({call_id}) is pending approval.")
        self._call_log.append({**request_details, "status": "pending"})
        await self.broadcast({"type": "new_request", "payload": request_details})

        # Wait here until the user approves via the API
        await approval_event.wait()

        print(f"Tool call '{tool_name}' ({call_id}) was approved. Executing.")
        # Once approved, execute the original function
        result = await func(*args, **kwargs)

        # Log completion and notify UI
        self._call_log[-1]["status"] = "approved_and_executed"
        await self.broadcast({
            "type": "request_approved",
            "payload": {"id": call_id, "result": str(result)},
        })
        return result

    async def approve(self, call_id: str):
        """Approve a pending tool call."""
        if call_id in self._pending_approvals:
            approval = self._pending_approvals.pop(call_id)
            approval["event"].set()  # This unblocks the waiting `request_approval` method
            return True
        return False
    
    
    async def deny(self, call_id: str):
        """Deny a pending tool call."""
        if call_id in self._pending_approvals:
            approval = self._pending_approvals.pop(call_id)
            self._call_log[-1]["status"] = "denied"
            await self.broadcast({
                "type": "request_denied",
                "payload": {"id": call_id},
            })
            return True
        return False
    


approval_manager = ApprovalManager()