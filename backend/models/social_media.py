"""
Pydantic models for the social media post generation endpoints.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class SocialMediaGenerateRequest(BaseModel):
    """Request to generate a social media post."""
    platform: str = Field(..., description="Target platform (instagram, linkedin, facebook, twitter, other)")
    prompt: str = Field(..., description="User prompt for content generation")


class SocialMediaPost(BaseModel):
    """Generated social media post response.
    
    Note: AI generates content and hashtags only.
    ctaLinks and images are managed via UI and start as empty arrays.
    """
    platform: str
    content: str
    hashtags: List[str]
    ctaLinks: List[dict]  # Managed by UI - starts empty
    images: List[str] = []  # Managed by UI - starts empty


class SocialMediaValidateRequest(BaseModel):
    """Request to validate a social media post."""
    platform: str
    content: str
    hashtags: List[str]
    ctaLinks: List[dict]
    images: List[str] = []


class SocialMediaValidationResult(BaseModel):
    """Validation result for a social media post."""
    compliance_score: int
    issues: List[dict]
    platform_specific: dict
