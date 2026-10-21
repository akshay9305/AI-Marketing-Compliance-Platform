"""
CTA Validation router for validating call-to-action links
"""
import asyncio
import logging
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse

from models.cta_validation import (
    AuthRequest,
    AuthResponse,
    CTAValidationRequest,
    CTAValidationResponse,
    AuthUploadRequest
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory task storage (in production, use Redis/database)
validation_tasks: Dict[str, Dict[str, Any]] = {}


def cleanup_old_tasks():
    """Clean up completed/error tasks older than 1 hour"""
    current_time = datetime.now()
    to_remove = []

    for task_id, task in validation_tasks.items():
        if task["status"] in ["completed", "error"]:
            age = current_time - task["created_at"]
            if age.total_seconds() > 3600:  # 1 hour
                to_remove.append(task_id)

    for task_id in to_remove:
        del validation_tasks[task_id]
        logger.info(f"Cleaned up old task: {task_id}")


def get_cta_service():
    """Lazy load CTA service to avoid import-time heavy dependencies"""
    from services.cta_validation_service import CTAValidationService
    return CTAValidationService()


@router.post("/auth/capture", response_model=AuthResponse)
async def capture_authentication(
    auth_request: AuthRequest,
    background_tasks: BackgroundTasks
):
    """
    Capture authentication state from a sign-in URL
    Opens a browser window for the user to authenticate
    """
    try:
        cta_service = get_cta_service()
        logger.info(f"Starting auth capture for: {auth_request.signin_url}")

        # Run authentication capture in background to avoid blocking
        auth_result = await asyncio.get_event_loop().run_in_executor(
            None,
            cta_service.capture_authentication,
            auth_request.signin_url,
            auth_request.wait_time
        )

        auth_response = AuthResponse(
            status=auth_result["status"],
            message=auth_result["message"],
            auth_file=auth_result["auth_file"]
        )

        return auth_response

    except Exception as e:
        logger.error(f"Auth capture error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication capture failed: {str(e)}"
        )


@router.post("/auth/upload-state", response_model=AuthResponse)
async def upload_auth_state(auth_upload: AuthUploadRequest):
    """
    Upload authentication state from frontend
    Frontend captures auth data and sends it to backend
    """
    try:
        cta_service = get_cta_service()
        logger.info(f"Uploading auth state from: {auth_upload.source}")

        # Save the authentication state
        result = cta_service.save_auth_state_from_frontend(
            auth_upload.auth_data
        )

        auth_response = AuthResponse(
            status=result["status"],
            message=result["message"],
            auth_file=result["auth_file"]
        )

        return auth_response

    except Exception as e:
        logger.error(f"Auth upload error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication upload failed: {str(e)}"
        )


@router.post("/validate", response_model=CTAValidationResponse)
async def validate_ctas(request: CTAValidationRequest):
    """
    Validate CTAs from HTML content
    """
    try:
        cta_service = get_cta_service()
        logger.info(
            f"Starting CTA validation for HTML content "
            f"({len(request.html_content)} chars)"
        )

        if not request.html_content or not request.html_content.strip():
            raise HTTPException(
                status_code=400,
                detail="HTML content cannot be empty"
            )

        # Extract and validate CTAs
        results = await cta_service.validate_ctas(
            request.html_content,
            request.limit
        )

        response = CTAValidationResponse(
            status="success",
            total_ctas=len(results),
            processed_ctas=len([r for r in results if not r.get("error")]),
            results=results,
            timestamp=datetime.now().isoformat()
        )

        logger.info(f"CTA validation completed: {len(results)} CTAs processed")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CTA validation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"CTA validation failed: {str(e)}"
        )


@router.post("/validate/stream/start")
async def start_streaming_validation(request: CTAValidationRequest):
    """
    Start streaming CTA validation and return a task ID
    """
    try:
        # Clean up old tasks periodically
        cleanup_old_tasks()

        logger.info(
            f"Starting streaming validation task for HTML content "
            f"(length: {len(request.html_content)})"
        )

        if not request.html_content or not request.html_content.strip():
            raise HTTPException(
                status_code=400,
                detail="HTML content cannot be empty"
            )

        # Generate unique task ID
        task_id = str(uuid.uuid4())

        # Store task information
        validation_tasks[task_id] = {
            "html_content": request.html_content,
            "limit": request.limit or 30,
            "status": "pending",
            "created_at": datetime.now(),
            "results": [],
            "progress": {"total": 0, "processed": 0, "current": None}
        }

        logger.info(f"Created validation task {task_id}")

        return {
            "task_id": task_id,
            "status": "started",
            "message": (
                "Streaming validation started. Connect to "
                f"/validate/stream/{task_id} for results."
            )
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start streaming validation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start streaming validation: {str(e)}"
        )


@router.get("/validate/stream/{task_id}")
async def validate_ctas_stream(task_id: str):
    """
    Stream CTA validation results for a specific task ID
    Returns Server-Sent Events with real-time progress and results
    """
    try:
        logger.info(f"Starting streaming for task {task_id}")

        # Check if task exists
        if task_id not in validation_tasks:
            raise HTTPException(
                status_code=404,
                detail=f"Task {task_id} not found"
            )

        task = validation_tasks[task_id]
        html_content = task["html_content"]
        limit = task["limit"]

        cta_service = get_cta_service()

        logger.info(
            f"Streaming validation for task {task_id} with HTML content "
            f"({len(html_content)} chars)"
        )

        return StreamingResponse(
            validate_ctas_generator(
                html_content, limit, cta_service, task_id
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CTA validation stream error for task {task_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"CTA validation stream failed: {str(e)}"
        )


async def validate_ctas_generator(
    html_content: str,
    limit: Optional[int],
    service,
    task_id: str
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE events for CTA validation progress
    """
    try:
        from services.cta_validation_service import (
            _scrape_cta_page_standalone,
            CTAValidatorAgent
        )
        from concurrent.futures import ProcessPoolExecutor

        # Update task status to processing
        validation_tasks[task_id]["status"] = "processing"

        # Extract CTAs from HTML
        ctas = service.extract_cta_links_from_html(html_content)

        logger.info(f"Found {len(ctas)} CTAs in HTML content")

        if limit:
            ctas = dict(list(ctas.items())[:limit])

        total_ctas = len(ctas)
        processed_results = []
        processed_count = 0
        error_count = 0

        # Update task with total count
        validation_tasks[task_id]["progress"]["total"] = total_ctas

        # Send initial progress event
        progress_data = {'total': total_ctas, 'processed': 0, 'current': None}
        yield f"event: progress\ndata: {json.dumps(progress_data)}\n\n"

        # Process each CTA
        for i, (cta_text, cta_url) in enumerate(ctas.items()):
            try:
                # Send processing event
                processing_data = {
                    'index': i+1, 'text': cta_text, 'url': cta_url
                }
                yield "event: processing\n"
                yield f"data: {json.dumps(processing_data)}\n\n"

                logger.info(f"Processing CTA {i+1}/{total_ctas}: {cta_text}")

                # Scrape the CTA page
                loop = asyncio.get_event_loop()

                with ProcessPoolExecutor() as executor:
                    scraped = await loop.run_in_executor(
                        executor,
                        _scrape_cta_page_standalone,
                        cta_url,
                        service.auth_file
                    )

                # Create result
                result = {
                    "cta_text": cta_text,
                    "cta_url": cta_url,
                    "scraped_title": scraped['title'],
                    "scraped_headers": scraped['headers'],
                    "scraped_body_snippet": scraped['body']
                }

                # Add LLM validation
                try:
                    agent = CTAValidatorAgent()

                    if agent.client:
                        llm_response = agent.validate_content(str(result))

                        if llm_response.startswith("```json"):
                            llm_response = llm_response[7:]
                        if llm_response.endswith("```"):
                            llm_response = llm_response[:-3]

                        validation_result = json.loads(llm_response.strip())
                        result['llm_validation'] = (
                            validation_result.get("analysis", "")
                        )
                    else:
                        result['llm_validation'] = (
                            "LLM validation unavailable - check credentials"
                        )
                except Exception as e:
                    logger.error(
                        f"LLM validation failed for CTA '{cta_text}': {e}"
                    )
                    result['llm_validation'] = {
                        "error": f"LLM validation failed: {str(e)}"
                    }

                processed_results.append(result)
                processed_count += 1

                # Update task progress
                task_progress = validation_tasks[task_id]["progress"]
                task_progress["processed"] = processed_count
                task_progress["current"] = cta_text
                validation_tasks[task_id]["results"].append(result)

                # Send result event
                yield f"event: result\ndata: {json.dumps(result)}\n\n"

                # Send progress update
                progress_update = {
                    'total': total_ctas,
                    'processed': processed_count,
                    'current': i+1
                }
                yield "event: progress\n"
                yield f"data: {json.dumps(progress_update)}\n\n"

                # Rate limiting between requests
                if i < total_ctas - 1:
                    await asyncio.sleep(3)

            except Exception as e:
                logger.error(f"Error processing CTA {cta_text}: {e}")
                error_count += 1

                error_result = {
                    "cta_text": cta_text,
                    "cta_url": cta_url,
                    "scraped_title": "Error",
                    "scraped_headers": [],
                    "scraped_body_snippet": "",
                    "llm_validation": "LLM validation skipped due to error",
                    "error": str(e)
                }

                processed_results.append(error_result)
                yield f"event: error\ndata: {json.dumps(error_result)}\n\n"

        # Update task status to completed
        validation_tasks[task_id]["status"] = "completed"

        # Send completion event
        completion_data = {
            "status": "completed",
            "total_ctas": total_ctas,
            "processed_ctas": processed_count,
            "error_ctas": error_count,
            "results": processed_results,
            "timestamp": datetime.now().isoformat()
        }

        yield f"event: complete\ndata: {json.dumps(completion_data)}\n\n"

    except Exception as e:
        logger.error(f"CTA validation generator error: {e}")
        validation_tasks[task_id]["status"] = "error"

        error_data = {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
        yield f"event: error\ndata: {json.dumps(error_data)}\n\n"


@router.get("/health")
async def cta_validation_health():
    """CTA validation service health check"""
    return {"status": "healthy", "service": "cta-validation"}


@router.get("/auth/setup-guide")
async def auth_setup_guide():
    """Get setup guide for authentication capture"""
    return {
        "backend_approach": {
            "description": "Backend opens browser for authentication",
            "endpoint": "POST /cta-validation/auth/capture",
            "request_body": {
                "signin_url": "https://example.com/login",
                "wait_time": 30
            },
            "notes": [
                "Opens browser window on server machine",
                "User must complete login in that browser",
                "Best for development/testing"
            ]
        },
        "frontend_approach": {
            "description": "Frontend handles authentication capture",
            "recommended_endpoint": "POST /cta-validation/auth/upload-state",
            "implementation_notes": [
                "More secure - auth happens in user's browser",
                "Better user experience",
                "Works in all environments"
            ]
        },
        "streaming_available": True,
        "streaming_start_endpoint": "/cta-validation/validate/stream/start",
        "streaming_stream_endpoint": "/cta-validation/validate/stream/{task_id}"
    }


@router.get("/debug/extract-ctas")
async def debug_extract_ctas(html_content: str):
    """Debug endpoint to test CTA extraction without full validation"""
    try:
        cta_service = get_cta_service()
        ctas = cta_service.extract_cta_links_from_html(html_content)

        preview = (
            html_content[:200] + "..."
            if len(html_content) > 200 else html_content
        )

        return {
            "html_length": len(html_content),
            "html_preview": preview,
            "total_links_found": len(ctas),
            "ctas": ctas
        }

    except Exception as e:
        logger.error(f"Debug extraction error: {e}")
        return {"error": str(e)}
