"""
Locale comparison service for email translation quality analysis using LLM
"""
import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import json

from config import get_config
from services.llm_proxy import LLMProxy

logger = logging.getLogger(__name__)


class LocaleComparisonAgent:
    """
    A class for locale comparison using LLM.
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
            logger.info("LocaleComparisonAgent initialized with LLM")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.client = None

        if system_message:
            self.set_system_message(system_message)
        else:
            self._set_default_system_message()

    def _set_default_system_message(self):
        default_message = """You are an expert localization validator for a multinational manufacturer of confectionery, pet food, and other food products (Mars).  

You are given two email contents:  
- **Base Email**: written in English or the original source language  
- **Locale Email**: translated/localized version  most probably french

Your task is to compare them for accuracy, consistency, and customer experience impact.  

Validation Categories:
1. **Structural Consistency**: Same sections (greeting, booking details, footer)
2. **Terminology Accuracy**: Travel terms correctly translated
3. **Critical Information**: PNR codes, dates, prices preserved
4. **Localization Formatting**: Dates, times, currency follow locale standards
5. **Tone & Politeness**: Culturally appropriate
6. **Translation Quality**: No mistranslations, omissions, additions
7. **Special Characters & Encoding**: Locale-specific characters properly displayed
8. **Legal & Compliance**: Disclaimers, privacy policies preserved

For each issue found, provide:
- "type": category (structure, terminology, critical_info, localization, tone, translation, encoding, legal)
- "severity": "high", "medium", or "low"
- "location": section or element where the issue occurs
- "issue": description of the problem
- "suggestion": recommendation to fix it
- "base_context": relevant snippet from base email (max 100 chars)
- "locale_context": relevant snippet from locale email (max 100 chars)

Respond ONLY with valid JSON in this format:
{
  "issues": [
    {
      "type": "critical_info",
      "severity": "high",
      "location": "product Details",
      "issue": "product details missing in localized version",
      "suggestion": "Ensure localized email includes product details",
      "base_context": "Chocolate Bar - Product ID: 12345",
      "locale_context": "Flugnummer: ---"
    }
  ]
}

Limit to maximum 10 most important issues."""

        self.set_system_message(default_message)

    def set_system_message(self, content: str):
        self.messages = []
        self.messages.insert(0, {"role": "system", "content": content})

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def compare(self, base_content: str, text_content: str) -> str:
        if not self.client:
            raise Exception("LLM client not available.")

        message = f"""
BASE EMAIL CONTENT:
{base_content}
LOCALE EMAIL CONTENT:
{text_content}

Please compare the base and locale email content and identify quality issues."""

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
        return soup.get_text(strip=True)


async def compare_with_llm(
    base_content: str,
    locale_content: str
) -> List[Dict[str, Any]]:
    """Use LLM to validate email content quality"""
    agent = None
    try:
        agent = LocaleComparisonAgent()

        if not agent.client:
            raise Exception("LLM credentials not configured")

        llm_response = agent.compare(
            base_content=base_content,
            text_content=locale_content
        )

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
            "base_context": "AI analysis unavailable",
            "locale_context": "AI analysis unavailable"
        }]
    #finally:
    #    if agent:
    #        agent.cleanup()
