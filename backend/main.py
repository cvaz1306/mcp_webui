# src/main.py

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ApprovalManager import approval_manager
from mcp_server import mcp

# --- Pydantic Models for API ---

class ToolCallUpdate(BaseModel):
    modifications: Dict[str, Any]

class BatchActionPayload(BaseModel):
    ids: List[str]

class UserResponsePayload(BaseModel):
    text: str
    question_id: Optional[str] = None

class WebSocketMessage(BaseModel):
    type: str
    payload: Dict[str, Any]


# --- FastAPI Application Setup ---

app = FastAPI(title="MCP Human-in-the-Loop Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await approval_manager.add_connection(websocket)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_json()
            message = WebSocketMessage.model_validate(data)
            
            # --- NEW: Handle incoming user responses ---
            if message.type == "user_response":
                await approval_manager.handle_user_response(message.payload)
            else:
                # You can handle other client-side message types here if needed
                print(f"Received unhandled message type: {message.type}")

    except WebSocketDisconnect:
        approval_manager.remove_connection(websocket)
    except Exception as e:
        print(f"An error occurred in the WebSocket connection: {e}")
        approval_manager.remove_connection(websocket)


@app.get("/api/tool_calls")
async def get_tool_calls():
    # The approval manager now returns a dict with 'pending' and 'log'
    return JSONResponse(
        approval_manager.get_tool_calls(100),
        status_code=200,
    )

# --- NEW: API to get chat history ---
@app.get("/api/chat-history")
async def get_chat_history():
    return JSONResponse(
        {"history": approval_manager.get_chat_history()},
        status_code=200
    )


@app.post("/api/approve/{call_id}")
async def approve_tool_call(call_id: str, data: ToolCallUpdate):
    # Pass modifications to the approval manager
    success = await approval_manager.approve(call_id, data.modifications)
    if success:
        return JSONResponse({"status": "approved", "call_id": call_id}, status_code=200)
    return JSONResponse({"status": "not_found", "call_id": call_id}, status_code=404)


@app.post("/api/deny/{call_id}")
async def deny_tool_call(call_id: str):
    success = await approval_manager.deny(call_id)
    if success:
        return JSONResponse({"status": "denied", "call_id": call_id}, status_code=200)
    return JSONResponse({"status": "not_found", "call_id": call_id}, status_code=404)


@app.post("/api/approve-batch")
async def approve_batch_tool_calls(payload: BatchActionPayload):
    approved_ids = []
    for call_id in payload.ids:
        # Batch approval doesn't support modifications for simplicity
        success = await approval_manager.approve(call_id)
        if success:
            approved_ids.append(call_id)
    return JSONResponse({"status": "batch_processed", "approved_ids": approved_ids})

@app.post("/api/deny-batch")
async def deny_batch_tool_calls(payload: BatchActionPayload):
    denied_ids = []
    for call_id in payload.ids:
        success = await approval_manager.deny(call_id)
        if success:
            denied_ids.append(call_id)
    return JSONResponse({"status": "batch_processed", "denied_ids": denied_ids})

# --- Simulation Runner ---
if __name__ == "__main__":
    import uvicorn
    import threading

    def run_mcp():
        mcp.run(transport="streamable-http", host="localhost", port=8001)

    mcp_thread = threading.Thread(target=run_mcp, daemon=True)
    mcp_thread.start()

    print("Starting FastAPI server on http://localhost:8000")
    print("Web UI will be available on http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000)