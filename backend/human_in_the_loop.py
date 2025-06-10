# --- 2. Custom Decorator for Human-in-the-Loop ---

from ApprovalManager import approval_manager


import uuid
from functools import wraps
from typing import Callable, Coroutine


def human_in_the_loop(requires_approval: bool = False, renderer: str = "default"):
    """
    A decorator that wraps an MCP tool. If `requires_approval` is True,
    it pauses execution and waits for human approval via the Web UI.
    """
    def decorator(func: Callable[..., Coroutine]):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            tool_name = func.__name__
            if not requires_approval:
                print(f"Executing auto-approved tool: '{tool_name}'")
                result = await func(*args, **kwargs)
                log_entry = {
                    "id": str(uuid.uuid4()),
                    "tool_name": tool_name,
                    "args": args,
                    "kwargs": kwargs,
                    "status": "auto_approved",
                    "result": str(result),
                }
                approval_manager._call_log.append(log_entry)
                await approval_manager.broadcast({"type": "log_update", "payload": log_entry})
                return result
            else:
                # This call will block until approved
                return await approval_manager.request_approval(func, args, kwargs, renderer)
        return wrapper
    return decorator