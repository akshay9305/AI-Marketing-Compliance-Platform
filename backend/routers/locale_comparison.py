"""
Locale Comparison router for email translation quality analysis
"""
import logging
from fastapi import APIRouter, HTTPException

from models.locale_comparison import (
    LocaleComparisonRequest,
    LocaleComparisonResponse,
    LocaleIssue,
    BulkLocaleComparisonRequest,
    BulkLocaleComparisonResponse,
    LocaleComparisonSummary
)

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def locale_comparison_health():
    """Locale comparison service health check"""
    return {"status": "healthy", "service": "locale-comparison"}


@router.post("/compare", response_model=LocaleComparisonResponse)
async def compare_locales(request: LocaleComparisonRequest):
    """
    Compare base content with localized content for translation quality,
    accuracy, and cultural appropriateness
    """
    try:
        from bs4 import BeautifulSoup
        from services.locale_comparison_service import compare_with_llm

        logger.info(
            f"Starting locale comparison (LLM: {request.use_llm}, "
            f"Languages: {request.base_language} -> {request.target_language})"
        )

        # Parse HTML content
        soup_base = BeautifulSoup(request.base_content, "html.parser")
        soup_locale = BeautifulSoup(request.locale_content, "html.parser")
        base_content = soup_base.get_text()
        locale_content = soup_locale.get_text()
        issues = []

        if request.use_llm:
            logger.info("Using LLM-based locale comparison")
            llm_issues = await compare_with_llm(
                base_content=base_content,
                locale_content=locale_content
            )
            issues.extend(llm_issues)
        else:
            logger.info("Rule-based locale comparison not yet implemented")
            issues = []

        # Convert dict issues to LocaleIssue objects
        validated_issues = []
        for issue in issues:
            try:
                validated_issues.append(LocaleIssue(**issue))
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
        comparison_type = "AI-powered" if request.use_llm else "Rule-based"
        language_info = ""
        if request.base_language and request.target_language:
            language_info = (
                f" ({request.base_language} → {request.target_language})"
            )

        if overall_score >= 85:
            summary = (
                f"{comparison_type} locale analysis{language_info}: "
                f"Excellent translation quality! {total_issues} minor issues."
            )
        elif overall_score >= 70:
            summary = (
                f"{comparison_type} locale analysis{language_info}: "
                f"Good translation with {total_issues} issues. "
                f"Focus on {high_severity} critical items."
            )
        else:
            summary = (
                f"{comparison_type} locale analysis{language_info}: "
                f"Translation needs improvement. {total_issues} issues found "
                f"including {high_severity} critical problems."
            )

        result = LocaleComparisonResponse(
            total_issues=total_issues,
            high_severity=high_severity,
            medium_severity=medium_severity,
            low_severity=low_severity,
            issues=validated_issues,
            overall_score=overall_score,
            summary=summary,
            comparison_type="llm" if request.use_llm else "rules",
            base_language=request.base_language,
            target_language=request.target_language
        )

        logger.info(
            f"Locale comparison completed: {total_issues} issues found, "
            f"score: {overall_score}%"
        )
        return result

    except Exception as e:
        logger.error(f"Failed to compare locales: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare_bulk", response_model=BulkLocaleComparisonResponse)
async def compare_bulk_locales(request: BulkLocaleComparisonRequest):
    """
    Compare multiple base/locale content pairs in a single request
    """
    try:
        logger.info(
            f"Starting bulk locale comparison of "
            f"{len(request.comparisons)} items"
        )

        results = []
        total_issues = 0
        total_score = 0
        all_issues_types = []
        languages_analyzed = set()

        for comparison_item in request.comparisons:
            item_id = comparison_item.get('id', 'unknown')
            base_content = comparison_item.get('base_content', '')
            locale_content = comparison_item.get('locale_content', '')
            base_language = comparison_item.get('base_language', 'en')
            target_language = comparison_item.get('target_language')

            languages_analyzed.add(base_language)
            if target_language:
                languages_analyzed.add(target_language)

            individual_request = LocaleComparisonRequest(
                base_content=base_content,
                locale_content=locale_content,
                base_language=base_language,
                target_language=target_language,
                use_llm=request.use_llm
            )

            comparison_result = await compare_locales(individual_request)

            total_issues += comparison_result.total_issues
            total_score += comparison_result.overall_score
            all_issues_types.extend([
                issue.type for issue in comparison_result.issues
            ])

            results.append({
                "id": item_id,
                "comparison": comparison_result
            })

        # Calculate summary statistics
        if request.include_summary and len(request.comparisons) > 0:
            average_score = total_score / len(request.comparisons)

            from collections import Counter
            issue_counts = Counter(all_issues_types)
            common_issues = [
                f"{issue_type} ({count} occurrences)"
                for issue_type, count in issue_counts.most_common(5)
            ]

            improvement_suggestions = []
            if 'critical_info' in issue_counts:
                improvement_suggestions.append(
                    "Ensure critical booking information is preserved"
                )
            if 'terminology' in issue_counts:
                improvement_suggestions.append(
                    "Review travel terminology consistency across locales"
                )
            if 'localization' in issue_counts:
                improvement_suggestions.append(
                    "Check date/time/currency formatting for target locale"
                )
            if 'translation' in issue_counts:
                improvement_suggestions.append(
                    "Consider human review for machine translation quality"
                )

            summary = LocaleComparisonSummary(
                total_comparisons=len(request.comparisons),
                average_score=round(average_score, 1),
                common_issues=common_issues,
                improvement_suggestions=improvement_suggestions,
                languages_analyzed=list(languages_analyzed)
            )
        else:
            summary = LocaleComparisonSummary(
                total_comparisons=len(request.comparisons),
                average_score=0.0,
                common_issues=[],
                improvement_suggestions=[],
                languages_analyzed=[]
            )

        logger.info(
            f"Bulk locale comparison completed: {len(results)} items processed"
        )

        return BulkLocaleComparisonResponse(
            results=results,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Failed to compare bulk locales: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/supported_languages")
async def get_supported_languages():
    """
    Get list of supported languages for locale comparison
    """
    return {
        "supported_languages": {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            "nl": "Dutch",
            "sv": "Swedish",
            "da": "Danish",
            "no": "Norwegian",
            "fi": "Finnish",
            "ru": "Russian",
            "pl": "Polish",
            "tr": "Turkish",
            "ar": "Arabic",
            "he": "Hebrew",
            "th": "Thai",
            "vi": "Vietnamese",
            "hi": "Hindi"
        },
        "note": "Language support depends on LLM capabilities"
    }


@router.get("/issue_categories")
async def get_locale_issue_categories():
    """
    Get list of all possible locale comparison issue categories
    """
    return {
        "issue_categories": {
            "structure": {
                "description": "Structural consistency between base and locale",
                "examples": ["Missing sections", "Additional content"]
            },
            "terminology": {
                "description": "Travel and booking terminology accuracy",
                "examples": ["Incorrect translation of 'check-in'"]
            },
            "critical_info": {
                "description": "Preservation of critical booking information",
                "examples": ["Missing PNR code", "Wrong dates"]
            },
            "localization": {
                "description": "Locale-specific formatting and conventions",
                "examples": ["Date format", "Currency format"]
            },
            "tone": {
                "description": "Cultural appropriateness and politeness",
                "examples": ["Inappropriate formality level"]
            },
            "translation": {
                "description": "Translation quality and accuracy",
                "examples": ["Mistranslation", "Machine translation artifacts"]
            },
            "encoding": {
                "description": "Character encoding and special characters",
                "examples": ["Garbled characters", "Missing accents"]
            },
            "legal": {
                "description": "Legal and compliance information",
                "examples": ["Missing disclaimers", "Regulatory requirements"]
            }
        }
    }
