"""
Pydantic models for Content Validation functionality
"""
from typing import List
from pydantic import BaseModel, Field


class ContentValidationRequest(BaseModel):
    """Request model for content validation"""
    html_content: str = Field(..., alias="html_content")
    use_llm: bool = False

    class Config:
        populate_by_name = True


class ValidationIssue(BaseModel):
    """Model for individual validation issue"""
    type: str  # currency, grammar, brand, formatting, accessibility, etc.
    severity: str  # high, medium, low
    location: str
    issue: str
    suggestion: str
    context: str


class ContentValidationResponse(BaseModel):
    """Response model for content validation"""
    total_issues: int
    high_severity: int
    medium_severity: int
    low_severity: int
    issues: List[ValidationIssue]
    overall_score: int
    summary: str
    validation_type: str  # llm or rules


class ValidationSummary(BaseModel):
    """Summary statistics for validation results"""
    total_content_analyzed: int
    average_score: float
    common_issues: List[str]
    improvement_suggestions: List[str]


class BulkValidationRequest(BaseModel):
    """Request model for bulk content validation"""
    contents: List[dict]  # List of {"id": str, "html_content": str}
    use_llm: bool = False
    include_summary: bool = True


class BulkValidationResponse(BaseModel):
    """Response model for bulk content validation"""
    results: List[dict]
    summary: ValidationSummary
