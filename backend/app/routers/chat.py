"""
The chat endpoint intentionally returns errors as a readable `answer`
instead of a bare 500, so the person using the UI sees exactly what's
wrong (e.g. missing GROQ_API_KEY) rather than a generic failure message.
The full traceback still lands in the uvicorn terminal for debugging.
"""

import traceback

from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.orchestrator import handle_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        result = await handle_message(request.message, request.active_site_id)
        return ChatResponse(answer=result["answer"], sources_used=result["sources_used"])
    except Exception as exc:
        traceback.print_exc()
        return ChatResponse(
            answer=f"Assistant error: {exc}",
            sources_used=[],
        )
