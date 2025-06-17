import asyncio
import random
from typing import List, Optional
from fastmcp import FastMCP
from human_in_the_loop import human_in_the_loop
from ApprovalManager import approval_manager

# We instantiate FastMCP to use its decorator for schema definition,
# but we won't be running it in a typical server mode.
mcp = FastMCP("Human-in-the-Loop Demo Server")

# --- Define Custom Tools ---

@mcp.tool
@human_in_the_loop(requires_approval=False)
async def get_weather(city: str) -> str:
    """Gets the current weather for a city. This tool is auto-approved."""
    return f"The weather in {city} is sunny and 75°F."

@mcp.tool
@human_in_the_loop(requires_approval=True, renderer="EditableRenderer")
async def send_email(to: str, subject: str, body: str) -> str:
    """Sends an email.

    Args:
        to (str): The email address to send the email to.
        subject (str): The subject of the email.
        body (str): The body of the email."""
    return f"Email with subject '{subject}' successfully sent to {to}."
 
@mcp.tool
@human_in_the_loop(requires_approval=True, renderer="FileSystemRenderer")
async def delete_file(path: str, recursive: bool) -> str:
    """Deletes a file or directory from the filesystem. Highly sensitive!"""
    if recursive:
        return f"Recursively deleted everything at path: {path}"
    return f"Deleted file: {path}"

@mcp.tool
@human_in_the_loop(requires_approval=True, renderer="NukeLaunchRenderer")
async def launch_nukes(target_coordinates: str, confirmation_code: str) -> str:
    """Code for launching a non-lethal time weapon that warps space-time to slow down a specific region, effectively neutralizing any threat at the location without causing any harm."""
    # In a real scenario, you'd check the confirmation_code
    return f"Nukes launched at {target_coordinates}. Have a nice day."


@mcp.tool
@human_in_the_loop(requires_approval=False)
async def ask_question(question: str, options: Optional[List[str]] = None) -> str:
    """
    Asks a question to the user.

    Args:
        question (str): The question to ask the user.
        options (Optional[List[str]]): A list of options to present to the user.

    Returns:
        str: The answer to the question.
    """
    response = await approval_manager.ask_question(question, options)
    return response

@mcp.tool
@human_in_the_loop(requires_approval=False)
async def tell_user(message: str) -> str:
    """
    Sends a message to the user.

    Args:
        message (str): The message to send to the user.

    Returns:
        str: A confirmation message.
    """
    await approval_manager.tell_user(message)
    return "Message sent to user."

if __name__ == "__main__":
    # To run the backend, you just need to run `main.py`
    print("This file defines the tools. Run 'main.py' to start the server.")