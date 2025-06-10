from typing import Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ApprovalManager import approval_manager
from mcp_server import mcp
# --- 3. FastAPI Application Setup ---

app = FastAPI(title="MCP Human-in-the-Loop Server")

# Allow CORS for the Next.js dev server
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
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        approval_manager.remove_connection(websocket)

@app.get("/api/tool_calls")
async def get_tool_calls():
    return JSONResponse(
        {"calls": approval_manager.get_tool_calls(100)},
        status_code=200,
    )

@app.post("/api/approve/{call_id}")
async def approve_tool_call(call_id: str):
    success = await approval_manager.approve(call_id)
    if success:
        return JSONResponse(
            {"status": "approved", "call_id": call_id}, status_code=200
        )
    return JSONResponse(
        {"status": "not_found", "call_id": call_id}, status_code=404
    )

@app.post("/api/deny/{call_id}")
async def deny_tool_call(call_id: str):
    success = await approval_manager.deny(call_id)
    if success:
        return JSONResponse(
            {"status": "denied", "call_id": call_id}, status_code=200
        )
    return JSONResponse(
        {"status": "not_found", "call_id": call_id}, status_code=404
    )


@app.post("/api/approve-batch")
async def approve_batch_tool_calls(payload: Dict[str, List[str]]):
    approved_ids = []
    call_ids = payload.get("ids", [])
    for call_id in call_ids:
        success = await approval_manager.approve(call_id)
        if success:
            approved_ids.append(call_id)
    return JSONResponse({"status": "batch_processed", "approved_ids": approved_ids})

@app.post("/api/deny-batch")
async def deny_batch_tool_calls(payload: Dict[str, List[str]]):
    denied_ids = []
    call_ids = payload.get("ids", [])
    for call_id in call_ids:
        success = await approval_manager.deny(call_id)
        if success:
            denied_ids.append(call_id)
    return JSONResponse({"status": "batch_processed", "denied_ids": denied_ids})

# --- 4. Simulation Runner ---
# We'll import and run this from mcp_server.py
if __name__ == "__main__":
    # This block is for direct execution, but we'll integrate with mcp_server.py
    import uvicorn
    import threading
    def run_mcp():
        mcp.run(transport="streamable-http", host="localhost", port=8001)
    mcp_thread =threading.Thread(target=run_mcp)
    mcp_thread.start()
    @app.on_event("startup")
    
    async def startup_event():
        pass
    print("Starting FastAPI server on http://localhost:8000")
    print("Web UI will be available on http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000)
    @app.on_event("shutdown")
    async def shutdown_event():
        mcp_thread.do_run = False
        mcp_thread.join()
