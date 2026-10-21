"""
CTA Validation models for request/response structures
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel


class AuthRequest(BaseModel):
    signin_url: str
    wait_time: Optional[int] = 30


class AuthResponse(BaseModel):
    status: str
    message: str
    auth_file: Optional[str] = None


class CTAValidationRequest(BaseModel):
    html_content: str
    limit: Optional[int] = 30


class CTAResult(BaseModel):
    cta_text: str
    cta_url: str
    scraped_title: str
    scraped_headers: List[str]
    scraped_body_snippet: str
    llm_validation: Union[str, Dict[str, Any]]
    error: Optional[str] = None


class CTAValidationResponse(BaseModel):
    status: str
    total_ctas: int
    processed_ctas: int
    results: List[CTAResult]
    timestamp: str


class AuthUploadRequest(BaseModel):
    auth_data: Dict[str, Any]
    source: Optional[str] = "frontend"
