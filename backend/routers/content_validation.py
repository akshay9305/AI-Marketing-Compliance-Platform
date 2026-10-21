"""
Content Validation router for email quality analysis using LLM
and rule-based validation
"""
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup

from models.content_validation import (
    ContentValidationRequest,
    ContentValidationResponse,
    ValidationIssue,
    ValidationSummary,
    BulkValidationRequest,
    BulkValidationResponse
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def content_validation_health():
    """Content validation service health check"""
    return {"status": "healthy", "service": "content-validation"}


@router.post("/validate", response_model=ContentValidationResponse)
async def validate_content(request: ContentValidationRequest):
    """
    Validate email content for quality issues
    Supports LLM-based and rule-based validation
    """
    try:
        from services.content_validation_service import (
            ContentValidationAgent,
            perform_rule_based_validation,
            validate_with_llm
        )

        logger.info(
            f"Starting validation (LLM: {request.use_llm}) for content"
        )

        # Parse HTML
        soup = BeautifulSoup(request.html_content, "html.parser")
        text_content = ContentValidationAgent.read_html_file(
            request.html_content
        )

        issues = []

        if request.use_llm:
            logger.info("Using LLM-based content validation")
            llm_issues = await validate_with_llm(text_content)
            issues.extend(llm_issues)
        else:
            logger.info("Using rule-based content validation")
            rule_issues = perform_rule_based_validation(soup, text_content)
            issues.extend(rule_issues)

        # Convert dict issues to ValidationIssue objects
        validated_issues = []
        for issue in issues:
            try:
                validated_issues.append(ValidationIssue(**issue))
            except Exception as e:
                logger.warning(f"Failed to validate issue: {e}")
                continue

        # Calculate summary statistics
        total_issues = len(validated_issues)
        high_severity = len([
            i for i in validated_issues if i.severity == 'high'
        ])
        medium_severity = len([
            i for i in validated_issues if i.severity == 'medium'
        ])
        low_severity = len([
            i for i in validated_issues if i.severity == 'low'
        ])

        # Calculate overall score
        divisor = high_severity + medium_severity + low_severity + 1
        penalty = (high_severity * 5 + medium_severity * 2 + low_severity * 1)
        penalty = penalty / divisor * 10
        overall_score = max(0, 100 - int(penalty))

        # Generate summary message
        validation_type = "AI-powered" if request.use_llm else "Rule-based"
        if overall_score >= 85:
            summary_msg = (
                f"{validation_type} validation: Excellent quality!"
                f" Only {total_issues} minor issues found."
            )
        elif overall_score >= 70:
            summary_msg = (
                f"{validation_type} validation: Good quality with"
                f" {total_issues} issues. Focus on {high_severity}"
                " critical items."
            )
        else:
            summary_msg = (
                f"{validation_type} validation: Quality needs work."
                f" {total_issues} issues found including {high_severity}"
                " critical problems."
            )

        result = ContentValidationResponse(
            total_issues=total_issues,
            high_severity=high_severity,
            medium_severity=medium_severity,
            low_severity=low_severity,
            issues=validated_issues,
            overall_score=overall_score,
            summary=summary_msg,
            validation_type="llm" if request.use_llm else "rules"
        )

        logger.info(
            f"Validation completed: {total_issues} issues, "
            f"score: {overall_score}%"
        )
        return result

    except Exception as e:
        logger.error(f"Failed to validate content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate_bulk", response_model=BulkValidationResponse)
async def validate_bulk_content(request: BulkValidationRequest):
    """
    Validate multiple email contents in a single request
    """
    try:
        logger.info(
            f"Starting bulk validation of {len(request.contents)} items"
        )

        results = []
        total_issues = 0
        total_score = 0
        all_issues_types = []

        for item in request.contents:
            item_id = item.get('id', 'unknown')
            html_content = item.get('html_content', '')

            individual_request = ContentValidationRequest(
                html_content=html_content,
                use_llm=request.use_llm
            )

            validation_result = await validate_content(individual_request)

            total_issues += validation_result.total_issues
            total_score += validation_result.overall_score
            all_issues_types.extend([
                issue.type for issue in validation_result.issues
            ])

            results.append({
                "id": item_id,
                "validation": validation_result
            })

        # Calculate summary statistics
        if request.include_summary and len(request.contents) > 0:
            average_score = total_score / len(request.contents)

            from collections import Counter
            issue_counts = Counter(all_issues_types)
            common_issues = [
                f"{issue_type} ({count} occurrences)"
                for issue_type, count in issue_counts.most_common(5)
            ]

            improvement_suggestions = []
            if 'currency' in issue_counts:
                improvement_suggestions.append(
                    "Review currency formatting guidelines"
                )
            if 'grammar' in issue_counts:
                improvement_suggestions.append(
                    "Run content through grammar checker"
                )
            if 'accessibility' in issue_counts:
                improvement_suggestions.append(
                    "Add alt text to all images"
                )
            if 'data' in issue_counts:
                improvement_suggestions.append(
                    "Replace all placeholder content"
                )

            summary = ValidationSummary(
                total_content_analyzed=len(request.contents),
                average_score=round(average_score, 1),
                common_issues=common_issues,
                improvement_suggestions=improvement_suggestions
            )
        else:
            summary = ValidationSummary(
                total_content_analyzed=len(request.contents),
                average_score=0.0,
                common_issues=[],
                improvement_suggestions=[]
            )

        logger.info(
            f"Bulk validation completed: {len(results)} items processed"
        )

        return BulkValidationResponse(
            results=results,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Failed to validate bulk content: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issue_categories")
async def get_issue_categories():
    """
    Get list of all possible issue categories for content validation
    """
    return {
        "issue_categories": {
            "currency": {
                "description": "Currency and pricing format issues",
                "examples": ["$ 100", "10.999", "100,00"]
            },
            "grammar": {
                "description": "Grammar and language issues",
                "examples": ["Sentence fragment", "Double punctuation"]
            },
            "brand": {
                "description": "Brand voice and tone issues",
                "examples": ["Inconsistent tone", "Off-brand language"]
            },
            "formatting": {
                "description": "HTML and visual formatting issues",
                "examples": ["Empty elements", "Broken layouts"]
            },
            "accessibility": {
                "description": "Accessibility compliance issues",
                "examples": ["Missing alt text", "Poor contrast"]
            },
            "content": {
                "description": "Content quality issues",
                "examples": ["Placeholder text", "Incomplete content"]
            },
            "localization": {
                "description": "Localization and translation issues",
                "examples": ["Untranslated text", "Wrong locale format"]
            },
            "cta": {
                "description": "Call-to-action issues",
                "examples": ["Unclear CTA", "Missing button"]
            },
            "data": {
                "description": "Data and placeholder issues",
                "examples": ["TODO markers", "[PLACEHOLDER] text"]
            },
            "spacing": {
                "description": "Spacing and whitespace issues",
                "examples": ["Multiple spaces", "Tab characters"]
            }
        }
    }
