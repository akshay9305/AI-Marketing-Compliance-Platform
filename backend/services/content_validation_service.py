"""
Content validation agent for email quality analysis using LLM and
rule-based validation
"""
import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import re
import json

from config import get_config
from services.llm_proxy import LLMProxy

logger = logging.getLogger(__name__)


class ContentValidationAgent:
    """
    A class for email content validation using LLM.
    """

    def __init__(
        self,
        model: str = None,
        max_tokens: int = None,
        system_message: Optional[str] = None
    ):
        config = get_config()
        self.model = model or config.llm_model
        self.max_tokens = max_tokens or config.llm_max_tokens

        try:
            self.client = LLMProxy()
            logger.info("ContentValidationAgent initialized with LLM")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.client = None

        if system_message:
            self.set_system_message(system_message)
        else:
            self._set_default_system_message()

    def _set_default_system_message(self):
        default_message = """You are an expert email content validator for a multinational manufacturer of confectionery, pet food, and other food products (Mars). 

Analyze the provided email content for quality issues and provide a JSON response.

Validation Categories:
1. **Currency & Pricing**: Format errors, inconsistent currency symbols, decimal places
2. **Grammar & Language**: Spelling errors, grammatical mistakes, awkward phrasing
3. **Legal Compliance**: Legal disclaimers, privacy policy links, unsubscribe options
4. **Content Quality**: Clarity, completeness, placeholder text, accuracy
5. **Call-to-Action**: Clarity and effectiveness of CTAs

For each issue found, provide:
- "type": category (currency, grammar, brand, formatting, accessibility, content, localization, cta)
- "severity": "high", "medium", or "low"
- "location": specific location/element where issue occurs
- "issue": description of the problem
- "suggestion": specific recommendation to fix it
- "context": relevant exact text snippet (max 100 chars)

Respond ONLY with valid JSON in this format:
{
  "issues": [
    {
      "type": "grammar",
      "severity": "medium",
      "location": "Paragraph 2",
      "issue": "Sentence fragment detected",
      "suggestion": "Complete the sentence with proper subject and verb",
      "context": "Great deals for you..."
    }
  ]
}

Limit to maximum 10 most important issues.
"""
        self.set_system_message(default_message)

    def set_system_message(self, content: str):
        self.messages = []
        self.messages.insert(0, {"role": "system", "content": content})

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def validate_content(self, text_content: str) -> str:
        if not self.client:
            raise Exception("LLM client not available.")

        message = f"""
EMAIL CONTENT:
{text_content}

Please analyze this email content and identify quality issues."""

        self.add_message("user", message)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=self.max_tokens,
        )
        return response.choices[0].message.content

    @staticmethod
    def read_html_file(html_content: str) -> str:
        soup = BeautifulSoup(html_content, "html.parser")
        text = soup.get_text()
        return re.sub(r'\s+', ' ', text).strip()


def perform_rule_based_validation(
    soup: BeautifulSoup,
    text_content: str
) -> List[Dict[str, Any]]:
    """Perform traditional rule-based validation"""
    issues = []

    # Currency Format Validation
    currency_patterns = [
        (r'\$\s+\d', 'Currency symbol should not have space before amount',
         'Remove space between $ and amount'),
        (r'\d+\.\d{3,}', 'Currency should have max 2 decimal places',
         'Use format like $10.99'),
        (r'\d+,\d{2}(?!\d)', 'Incorrect comma usage in currency',
         'Use period for decimal separator'),
    ]

    for pattern, issue, suggestion in currency_patterns:
        matches = re.finditer(pattern, text_content)
        for match in matches:
            context = text_content[max(0, match.start()-20):match.end()+20]
            issues.append({
                "type": "currency",
                "severity": "medium",
                "location": f"Position {match.start()}-{match.end()}",
                "issue": issue,
                "suggestion": suggestion,
                "context": context.strip()
            })

    # Spacing Issues
    spacing_patterns = [
        (r'\s{2,}', 'Multiple consecutive spaces found', 'Use single space'),
        (r'\t', 'Tab character found', 'Replace with appropriate spaces'),
        (r'\n{3,}', 'Multiple consecutive line breaks',
         'Use maximum 2 line breaks'),
    ]

    for pattern, issue, suggestion in spacing_patterns:
        matches = re.finditer(pattern, text_content)
        for match in matches:
            context = text_content[max(0, match.start()-15):match.end()+15]
            issues.append({
                "type": "spacing",
                "severity": "low",
                "location": f"Position {match.start()}-{match.end()}",
                "issue": issue,
                "suggestion": suggestion,
                "context": context.strip().replace('\n', '\\n')
            })

    # Grammar patterns
    grammar_patterns = [
        (r'\bi\s', 'Lowercase "i" should be capitalized', 'Use "I"'),
        (r'\s+[.!?]', 'Space before punctuation',
         'Remove space before punctuation'),
        (r'[.!?]{2,}', 'Multiple punctuation marks', 'Use single punctuation'),
    ]

    for pattern, issue, suggestion in grammar_patterns:
        matches = re.finditer(pattern, text_content, re.IGNORECASE)
        for match in matches:
            context = text_content[max(0, match.start()-20):match.end()+20]
            issues.append({
                "type": "grammar",
                "severity": "medium",
                "location": f"Position {match.start()}-{match.end()}",
                "issue": issue,
                "suggestion": suggestion,
                "context": context.strip()
            })

    # HTML/Formatting Issues
    # Check for empty elements
    empty_elements = soup.find_all(
        lambda tag: tag.name and not tag.get_text().strip()
        and not tag.find('img')
    )
    for elem in empty_elements[:5]:
        issues.append({
            "type": "formatting",
            "severity": "low",
            "location": f"<{elem.name}> element",
            "issue": "Empty HTML element found",
            "suggestion": "Remove empty elements or add content",
            "context": str(elem)[:100]
        })

    # Check for missing alt text in images
    images_without_alt = soup.find_all(
        'img', alt=lambda x: not x or not x.strip()
    )
    for img in images_without_alt[:3]:
        issues.append({
            "type": "accessibility",
            "severity": "high",
            "location": f"Image: {img.get('src', 'unknown')[:50]}",
            "issue": "Image missing alt text",
            "suggestion": "Add descriptive alt text for accessibility",
            "context": str(img)[:100]
        })

    # Check for placeholder data
    placeholders = re.finditer(
        r'(\[.*?\]|\{.*?\}|TODO|PLACEHOLDER|XXX)',
        text_content, re.IGNORECASE
    )
    for match in placeholders:
        context = text_content[max(0, match.start()-20):match.end()+20]
        issues.append({
            "type": "data",
            "severity": "high",
            "location": f"Position {match.start()}-{match.end()}",
            "issue": "Placeholder or TODO text found",
            "suggestion": "Replace with actual content",
            "context": context.strip()
        })

    return issues


async def validate_with_llm(text_content: str) -> List[Dict[str, Any]]:
    """Use LLM to validate email content quality"""
    try:
        agent = ContentValidationAgent()

        if not agent.client:
            raise Exception("LLM credentials not configured")

        llm_response = agent.validate_content(text_content)

        # Clean up response
        if llm_response.startswith("```json"):
            llm_response = llm_response[7:]
        if llm_response.endswith("```"):
            llm_response = llm_response[:-3]

        validation_result = json.loads(llm_response.strip())

        logger.info(
            f"LLM validation completed: "
            f"{len(validation_result.get('issues', []))} issues found"
        )
        return validation_result.get("issues", [])

    except Exception as e:
        logger.error(f"LLM validation failed: {e}")
        return [{
            "type": "content",
            "severity": "medium",
            "location": "LLM Analysis",
            "issue": f"LLM validation failed: {str(e)}",
            "suggestion": "Try rule-based validation or check configuration",
            "context": "AI analysis unavailable"
        }]
