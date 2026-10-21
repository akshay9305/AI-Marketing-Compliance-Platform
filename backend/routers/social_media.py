"""
Social media endpoints.
"""
import logging
import re
from fastapi import APIRouter, HTTPException

from models.social_media import (
    SocialMediaGenerateRequest,
    SocialMediaPost,
    SocialMediaValidateRequest,
    SocialMediaValidationResult
)
from services import content_validation

router = APIRouter(prefix="/social-media")
log = logging.getLogger(__name__)


@router.post("/generate", response_model=SocialMediaPost)
async def generate_social_media_post(
    request: SocialMediaGenerateRequest,
) -> SocialMediaPost:
    """Generate a social media post using AI based on prompt and platform"""
    try:
        log.info(
            f"Received social media generation request for {request.platform}"
        )

    # Import service inside the handler to avoid heavy imports at
    # module import time
        from services.social_media_generation import generate_media_post

        # Call the AI generation service
        result = await generate_media_post(
            query=request.prompt,
            platform=request.platform,
        )

    # The service should return a structured response that matches
    # the SocialMediaPost model
        if not result or not isinstance(result, dict):
            # Fallback to mock generation if AI service fails
            log.warning("AI service failed, using fallback generation")
            return await generate_fallback_post(request)

        return SocialMediaPost(**result)

    except Exception as e:
        log.error(f"Error generating social media post: {e}")
        # Return fallback instead of raising error
        return await generate_fallback_post(request)


async def generate_fallback_post(
    request: SocialMediaGenerateRequest,
) -> SocialMediaPost:
    """Fallback post generation when AI service is unavailable"""
    import random
    
    # Platform-specific configurations
    platform_configs = {
        "instagram": {
            "max_length": 2200,
            "hashtags": ["#Instagram", "#Social", "#Marketing", "#Engagement"],
            "style_text": (
                "Share your thoughts in the comments below and tag a friend "
                "who needs to see this!"
            )
        },
        "linkedin": {
            "max_length": 3000,
            "hashtags": ["#LinkedIn", "#Professional", "#Business", "#Career"],
            "style_text": (
                "I'd love to hear your thoughts on this development "
                "in the comments."
            )
        },
        "facebook": {
            "max_length": 63206,
            "hashtags": ["#Facebook", "#Community", "#Social"],
            "style_text": (
                "What are your thoughts? Let us know in the comments "
                "and share with friends!"
            )
        },
        "twitter": {
            "max_length": 280,
            "hashtags": ["#Twitter", "#X", "#Trending"],
            "style_text": "Thoughts? 🤔"
        },
        "other": {
            "max_length": 1000,
            "hashtags": ["#Social", "#Marketing"],
            "style_text": "What do you think about this?"
        }
    }
    
    config = platform_configs.get(request.platform, platform_configs["other"])
    
    # Content templates
    content_templates = [
        (
            (
                "🚀 Exciting news! {prompt}\n\nJoin us on this incredible "
                "journey and discover what makes us different. {style_text}"
                "\n\n✨ Ready to get started?"
            )
        ),
        (
            (
                "🎯 Breaking: {prompt}\n\nWe're thrilled to share this "
                "update with our amazing community. {style_text}\n\n💫 "
                "What do you think?"
            )
        ),
        (
            (
                "💡 Innovation alert! {prompt}\n\nThis is exactly what "
                "we've been working towards. {style_text}\n\n🔥 Let's make it "
                "happen!"
            )
        ),
        (
            (
                "🌟 Big announcement! {prompt}\n\nWe couldn't be more "
                "excited to bring you this. {style_text}\n\n🎉 Join the "
                "celebration!"
            )
        )
    ]
    
    # Generate content
    template = random.choice(content_templates)
    generated_content = template.format(
        prompt=request.prompt,
        style_text=config["style_text"]
    )
    
    # Truncate if needed
    if len(generated_content) > config["max_length"]:
        generated_content = generated_content[:config["max_length"]-3] + "..."
    
    # Generate hashtags from prompt
    base_hashtags = config["hashtags"].copy()
    prompt_words = request.prompt.split()
    for word in prompt_words[:3]:  # Add up to 3 hashtags from prompt
        if len(word) > 3:
            hashtag = (
                "#" + word.capitalize()
                .replace(' ', '')
                .replace(',', '')
                .replace('.', '')
            )
            if hashtag not in base_hashtags and len(base_hashtags) < 6:
                base_hashtags.append(hashtag)
    
    # Generate CTA links
    cta_links = [
        {"text": "Learn More", "url": "https://example.com/learn-more"},
        {"text": "Get Started", "url": "https://example.com/get-started"}
    ]
    
    return SocialMediaPost(
        platform=request.platform,
        content=generated_content,
        hashtags=base_hashtags[:6],  # Limit to 6 hashtags
        ctaLinks=cta_links[:1],  # Start with 1 CTA
        images=[]  # No images in fallback
    )


@router.post("/validate", response_model=SocialMediaValidationResult)
async def validate_social_media_post(
    request: SocialMediaValidateRequest,
) -> SocialMediaValidationResult:
    """Validate a social media post for compliance"""
    try:
        log.info(f"Validating social media post for {request.platform}")

        # Try LLM-based validation first and pass marketing_type='social_media'
        issues = []
        score = 100
        try:
            # country could be derived from request in future; default to
            # US for now
            country = 'US'
            llm_issues = await content_validation.validate_with_llm(
                request.content or '',
                country,
                'social_media'
            )

            # If LLM returned a list of issues, use it
            if isinstance(llm_issues, list) and len(llm_issues) > 0:
                # Transform LLM issues to match UI expectations
                issues = []
                for llm_issue in llm_issues:
                    if isinstance(llm_issue, dict):
                        # Create a message that combines issue and suggestion
                        issue_text = llm_issue.get('issue', '')
                        suggestion_text = llm_issue.get('suggestion', '')
                        location_text = llm_issue.get('location', '')
                        
                        message_parts = []
                        if issue_text:
                            message_parts.append(issue_text)
                        if suggestion_text:
                            message_parts.append(
                                f"Suggestion: {suggestion_text}"
                            )
                        if location_text and location_text != "LLM Analysis":
                            message_parts.append(f"Location: {location_text}")
                        
                        message = (
                            ". ".join(message_parts) if message_parts
                            else str(llm_issue)
                        )
                        
                        # Map LLM severity to UI expected values
                        llm_severity = llm_issue.get('severity', 'low').lower()
                        if llm_severity in ['high', 'error']:
                            ui_severity = 'error'
                        elif llm_severity in ['medium', 'warning']:
                            ui_severity = 'warning'
                        else:  # low, info, etc.
                            ui_severity = 'info'
                        
                        issues.append({
                            'severity': ui_severity,
                            'message': message
                        })
                    else:
                        # Fallback for non-dict issues
                        issues.append({
                            'severity': 'warning',
                            'message': str(llm_issue)
                        })
                score = 100 - min(100, len(issues) * 5)
            else:
                # If no LLM issues, start with empty issues
                issues = []
                score = 100
        except Exception:
            log.exception(
                'LLM validation for social media failed, falling back to '
                'rule checks'
            )
            # Start with empty issues if LLM failed
            issues = []
            score = 100

        # Always run rule-based checks (character, hashtags, links, images)
        # Character count validation
        platform_limits = {
            "instagram": 2200,
            "linkedin": 3000,
            "facebook": 63206,
            "twitter": 280,
            "other": 1000
        }

        char_limit = platform_limits.get(request.platform, 1000)
        if len(request.content) > char_limit:
            issues.append({
                "severity": "error",
                "message": (
                    f"Content exceeds {char_limit} character limit for "
                    f"{request.platform}"
                )
            })
            score -= 30

        # Hashtag validation
        if len(request.hashtags) > 10:
            issues.append({
                "severity": "warning",
                "message": "Too many hashtags may reduce engagement"
            })
            score -= 10

        # URL validation
        if len(request.ctaLinks) > 3:
            issues.append({
                "severity": "warning",
                "message": "Multiple links may appear spammy"
            })
            score -= 5

        # Image URL validation - check for Affine branding
        image_url_pattern = (
            r'https?://[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)'
            r'(?:\?[^\s]*)?'
        )
        
        # Check images in content
        content_image_urls = re.findall(
            image_url_pattern, request.content, re.IGNORECASE
        )
        
        # Check images in CTA links
        cta_image_urls = []
        for cta_link in request.ctaLinks:
            if isinstance(cta_link, dict) and 'url' in cta_link:
                url = cta_link['url']
                if re.search(image_url_pattern, url, re.IGNORECASE):
                    cta_image_urls.append(url)
        
        # Check uploaded images
        uploaded_image_urls = request.images
        
        # Combine all image URLs
        all_image_urls = (
            content_image_urls + cta_image_urls + uploaded_image_urls
        )
        
        if all_image_urls:
            invalid_images = []
            for url in all_image_urls:
                if 'Affine' not in url.lower():
                    invalid_images.append(url)
            
            if invalid_images:
                issues.append({
                    "severity": "error",
                    "message": (
                        f"Found {len(invalid_images)} image(s) without "
                        "Affine branding: " +
                        ", ".join(invalid_images[:3]) +  # Show first 3
                        ("..." if len(invalid_images) > 3 else "") +
                        ". All images must contain 'Affine' in the URL."
                    )
                })
                score -= 20

        return SocialMediaValidationResult(
            compliance_score=max(score, 0),
            issues=issues,
            platform_specific={
                "character_count": len(request.content),
                "hashtag_count": len(request.hashtags),
                "link_count": len(request.ctaLinks)
            }
        )
        
    except Exception as e:
        log.error(f"Error validating social media post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

        # Image URL validation - check for Affine branding
        image_url_pattern = (
            r'https?://[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)'
            r'(?:\?[^\s]*)?'
        )
        image_urls = re.findall(
            image_url_pattern, request.content, re.IGNORECASE
        )
        
        if image_urls:
            invalid_images = []
            for url in image_urls:
                if '' not in url.lower():
                    invalid_images.append(url)
            
            if invalid_images:
                issues.append({
                    "severity": "error",
                    "message": (
                        f"Found {len(invalid_images)} image(s) without "
                        "Affine branding: " +
                        ", ".join(invalid_images[:3]) +  # Show first 3
                        ("..." if len(invalid_images) > 3 else "") +
                        ". All images must contain 'Affine' in the URL."
                    )
                })
                score -= 20

        return SocialMediaValidationResult(
            compliance_score=max(score, 0),
            issues=issues,
            platform_specific={
                "character_count": len(request.content),
                "hashtag_count": len(request.hashtags),
                "link_count": len(request.ctaLinks)
            }
        )
        
    except Exception as e:
        log.error(f"Error validating social media post: {e}")
        raise HTTPException(status_code=500, detail=str(e))
