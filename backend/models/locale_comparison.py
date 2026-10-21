"""
Pydantic models for locale comparison functionality
"""
from typing import List, Optional
from pydantic import BaseModel


class LocaleComparisonRequest(BaseModel):
    """Request model for locale comparison"""
    base_content: str  # Original/source content (usually English)
    locale_content: str  # Translated/localized content
    base_language: Optional[str] = "en"  # Source language code
    target_language: Optional[str] = None  # Target language code
    use_llm: bool = True  # Whether to use LLM or rule-based comparison


class LocaleIssue(BaseModel):
    """Model for individual locale comparison issue"""
    type: str  # structure, terminology, critical_info, etc.
    severity: str  # high, medium, low
    location: str  # Section or element where issue occurs
    issue: str  # Description of the problem
    suggestion: str  # Recommendation to fix it
    base_context: Optional[str] = None  # Snippet from base email
    locale_context: Optional[str] = None  # Snippet from locale email


class LocaleComparisonResponse(BaseModel):
    """Response model for locale comparison"""
    total_issues: int
    high_severity: int
    medium_severity: int
    low_severity: int
    issues: List[LocaleIssue]
    overall_score: int  # 0-100 score based on issues found
    summary: str  # Human-readable summary
    comparison_type: str  # llm or rules
    base_language: Optional[str] = None
    target_language: Optional[str] = None


class BulkLocaleComparisonRequest(BaseModel):
    """Request model for bulk locale comparison"""
    comparisons: List[dict]  # List of {id, base_content, locale_content, ...}
    use_llm: bool = True
    include_summary: bool = True


class LocaleComparisonSummary(BaseModel):
    """Summary statistics for bulk comparisons"""
    total_comparisons: int
    average_score: float
    common_issues: List[str]
    improvement_suggestions: List[str]
    languages_analyzed: List[str]


class BulkLocaleComparisonResponse(BaseModel):
    """Response model for bulk locale comparison"""
    results: List[dict]  # List of comparison results with IDs
    summary: Optional[LocaleComparisonSummary] = None
