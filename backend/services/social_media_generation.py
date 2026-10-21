"""
Social Media Post design agent and validation using LLM
"""
import logging
import json
from typing import Optional

from config import get_config
from services.llm_proxy import LLMProxy

logger = logging.getLogger(__name__)


class PostDesignAgent:
    """
    A class for social media post design using LLM.
    """

    def __init__(
        self,
        model: str = None,
        max_tokens: int = 10000,
        system_message: Optional[str] = None
    ):
        """
        Initialize the PostDesignAgent with configuration.
        """
        config = get_config()
        self.model = model or config.llm_model
        self.max_tokens = max_tokens or config.llm_max_tokens

        try:
            self.client = LLMProxy()
            logger.info("PostDesignAgent initialized with LLM")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.client = None

        if system_message:
            self.set_system_message(system_message)
        else:
            self._set_default_system_message()

    def _set_default_system_message(self):
        """Set the default system prompt message for template design."""
        default_message = """- **Role:** You are an expert social media content creator for a global multinational manufacturer of confectionery, pet food, and other food products (Mars), specializing in platforms like Instagram, Twitter (X), Facebook, and LinkedIn.  

- **Task:** Based on the user’s request, create or modify a social media post. Always return the output **only** as valid JSON in the following format:

    ```json
    { "result": "<FINAL SOCIAL MEDIA POST>" }
    ```

- **Input fields from user:**
    - **requirements**: Specific instructions for changes or new content.
    - **tone**: Desired tone of the post (e.g., friendly, professional, casual, inspiring).
    - **post**: Existing post snippet or full draft. If not provided, create a new post.
    - **platform**: Target platform (Instagram, Twitter, Facebook, LinkedIn).

- **Output rules:**
    - Always return a **single JSON object** with the `result` field only.
    - If only **requirements** are given → create a new post.
    - If a **post** is given → return the modified full post.
    - Adapt the content to the **platform’s style**:
        - Instagram → concise + hashtags + emojis where appropriate.  
        - Twitter (X) → short, engaging, trending hashtags.  
        - Facebook → conversational, community-driven tone.  
        - LinkedIn → professional, insightful, brand-aligned.  
    - Apply the requested **tone** consistently.  
    - Ensure content reflects **Mars Group branding**: inspiring, trustworthy, travel-focused, and engaging.

- **Compliance & Legal rules:**
    - Do not make exaggerated claims (e.g., “best price guaranteed,” “once-in-a-lifetime,” as it is against the legal policy).  
    - Do not include sensitive or discriminatory content.  
    - When mentioning offers, use neutral phrasing (e.g., “up to X% off” instead of “always the lowest”).  
    - Avoid personal data, political statements, or medical/health claims.  
    - Posts must align with Mars' brand safety and legal standards.  

- **Validation rules:**
    - The JSON must be well-formed and valid.  
    - The `result` must be a **non-empty, polished, ready-to-post string**.  
    - Do not add any commentary, explanation, or extra fields outside the JSON.  
"""
        self.set_system_message(default_message)

    def set_system_message(self, content: str):
        """Set the system prompt message."""
        self.messages = []
        self.messages.insert(0, {"role": "system", "content": content})

    def add_message(self, role: str, content: str):
        """Add a message to the conversation history."""
        self.messages.append({"role": role, "content": content})

    def generate_post(self, query: str, current_post: str, tone: str , platform: str = "Twitter") -> str:
        """Generate social media post based on user inputs."""
        if not self.client:
            raise Exception("LLM client not available. Check credentials configuration.")
        
        message = f"""
USER REQUIREMENTS: {query}
TONE: {tone}
PLATFORM: {platform}
CURRENT POST: {current_post if current_post else 'N/A'}

IMPORTANT: Do NOT summarize. Do NOT provide only a diff. Do NOT add explanations."""
        
        self.add_message("user", message)
        
        try:
            logger.info(f"Making request to LLM with model: {self.model}")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.messages,
                max_tokens=self.max_tokens
            )
            
            logger.info("LLM request successful")
            

        except Exception as api_error:
            logger.error(f"LLM API request failed: {api_error}")
            logger.error(f"Error type: {type(api_error).__name__}")
            if hasattr(api_error, 'response'):
                logger.error(f"Response status: {getattr(api_error.response, 'status_code', 'unknown')}")
                logger.error(f"Response text: {getattr(api_error.response, 'text', 'unknown')}")
            raise api_error
        
        # Only keep the last user message to avoid context explosion
        self.messages = self.messages[:1] + self.messages[-1:]
        
        return response.choices[0].message.content


async def generate_media_post(
    query: str,
    platform: str = "twitter",
    tone: str = "Professional"   # ✅ ADD
) -> dict:

    """Use LLM to generate social media post based on user requirements"""
    try:
        # Initialize PostDesignAgent with proper credential handling
        # This will automatically try vault -> config -> provided credentials
        agent = PostDesignAgent()
        
        # Check if LLM client is available
        if not agent.client:
            logger.warning("LLM credentials not configured, using fallback")
            return generate_fallback_post_dict(query, platform)
        
        # Create a comprehensive query that includes JSON formatting instructions
        enhanced_query = f"""Generate a {platform} social media post.

Topic:
{query}

Tone:
{tone}

IMPORTANT:
- Maintain the {tone} tone consistently
- Adapt style to {platform}

        

IMPORTANT: Return your response as a valid JSON object with this exact structure:
{{
    "content": "The main post content with emojis and engaging text",
    "hashtags": ["#relevant", "#hashtags", "#for", "#the", "#post"]
}}

Guidelines:
- Keep content engaging and platform-appropriate for {platform}
- Include 3-6 relevant hashtags
- Use emojis to make content more engaging
- Follow {platform} best practices for length and style
- Do NOT include images or CTA links - those will be added via UI"""
        
        # Get LLM response
        result = agent.generate_post(
            query=enhanced_query, 
            current_post="", 
            tone="tone", 
            platform=platform
        )
        
        if not result:
            logger.warning("LLM returned empty response, using fallback")
            return generate_fallback_post_dict(query, platform)
        
        # Log the raw response for debugging
        logger.info(f"Raw LLM response (full): {result}")
        
        # Clean up response (remove markdown code blocks if present)
        if result.startswith("```json"):
            result = result[7:]
        if result.endswith("```"):
            result = result[:-3]
        
        # Log cleaned response for debugging
        logger.info(f"Cleaned response (full): {result}")
        
        try:
            # Parse JSON response
            post_data = json.loads(result.strip())
            
            # Validate and ensure required fields exist
            if not isinstance(post_data, dict):
                raise ValueError("Response is not a dictionary")
            
            # Extract content - handle different response formats
            content = ""
            hashtags = []
            
            # Check if response has the expected format
            if "content" in post_data:
                content = post_data.get("content", "")
                hashtags = post_data.get("hashtags", [])
            elif "result" in post_data:
                # Handle response with "result" field containing full post
                result_field = post_data.get("result", "")
                if isinstance(result_field, dict):
                    # If result is a dict, extract content and hashtags
                    content = result_field.get("content", "")
                    hashtags = result_field.get("hashtags", [])
                else:
                    # Assume it's a string containing the full post
                    result_text = result_field
                    # Extract hashtags from the result text
                    import re
                    hashtag_pattern = r'#\w+'
                    hashtags = re.findall(hashtag_pattern, result_text)
                    # Remove hashtags from content to avoid duplication
                    content = re.sub(hashtag_pattern, '', result_text).strip()
                    # Clean up extra spaces
                    content = ' '.join(content.split())
            else:
                # Fallback to the entire response as content
                content = str(post_data)
            
            # Ensure all required fields are present
            validated_post = {
                "platform": platform,  # Add platform for frontend
                "content": content if content else f"🚀 {query}",
                "hashtags": hashtags if isinstance(hashtags, list) else [],
                "ctaLinks": [],  # Always empty - managed by UI
                "images": []     # Always empty - managed by UI
            }
            
            logger.info(f"Post generation successful for {platform}")
            logger.info(f"Extracted content: {validated_post['content']}")
            logger.info(f"Extracted hashtags: {validated_post['hashtags']}")
            return validated_post
            
        except (json.JSONDecodeError, ValueError) as json_error:
            logger.error(f"JSON parsing failed: {json_error}")
            logger.error(f"Response content: {result}")
            logger.warning("Using fallback due to JSON parsing error")
            return generate_fallback_post_dict(query, platform)

    except Exception as e:
        logger.error(f"Post generation failed: {e}")
        logger.warning("Using fallback due to generation error")
        return generate_fallback_post_dict(query, platform)


def generate_fallback_post_dict(query: str, platform: str) -> dict:
    """Generate a fallback post when AI service is unavailable"""
    # Platform-specific configurations
    platform_configs = {
        "instagram": {
            "max_length": 2200,
            "hashtags": ["#Instagram", "#Social", "#Marketing"],
            "style_text": "Share your thoughts below! 💭"
        },
        "linkedin": {
            "max_length": 3000,
            "hashtags": ["#LinkedIn", "#Professional", "#Business"],
            "style_text": "What are your thoughts on this?"
        },
        "facebook": {
            "max_length": 1000,
            "hashtags": ["#Facebook", "#Community", "#Social"],
            "style_text": "Let us know what you think!"
        },
        "twitter": {
            "max_length": 280,
            "hashtags": ["#Twitter", "#X"],
            "style_text": "Thoughts? 🤔"
        },
        "other": {
            "max_length": 1000,
            "hashtags": ["#Social", "#Marketing"],
            "style_text": "What do you think?"
        }
    }
    
    config = platform_configs.get(platform, platform_configs["other"])
    
    # Generate content
    content = f"🚀 {query}\n\n{config['style_text']}"
    
    # Truncate if needed
    if len(content) > config["max_length"]:
        content = content[:config["max_length"]-3] + "..."
    
    return {
        "platform": platform,
        "content": content,
        "hashtags": config["hashtags"],
        "ctaLinks": [],  # Always empty - managed by UI
        "images": []     # Always empty - managed by UI
    }
