"""Content validation agent for email quality analysis.

This module provides a thin wrapper around an LLM proxy and a small
sanitizer/reader to extract text from HTML for validation. It also
contains helpers to call the agent in a node-aware way (where callers
pass a list of {node_id, text}).
"""
import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Any, Optional
import re
import asyncio
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
        max_tokens: int = 10000,
        system_message: Optional[str] = None
    ):
        """
        Initialize the ContentValidationAgent for HTML validation.
        """
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
        """Set the default system prompt message for email validation."""
        default_message = (
            "You are a professional Marketing Content Compliance and Quality "
            "Validator for a global multinational manufacturer of confectionery, pet food, and other food products(Mars).\n\n"
            "Analyze the provided marketing content (email, affiliate, or "
            "social media) for quality, compliance, and ethical issues based "
            "on the specified marketing_type and country.\n\n"
            "Input variables:\n"
            "- marketing_type: email, affiliate, social_media, sms, etc.\n"
            "- country: US, EU, Canada, India, etc.\n"
            "- content: The extracted text or full copy from the marketing\n"
            "material.\n\n"
            "Output a JSON object with key 'issues' (up to 10 items).\n"
            "Each issue should include optional node_id, type, and severity.\n"
            "Include location, issue, suggestion, and a short context.\n"
        )

        self.set_system_message(default_message)

    def validate_content(
        self,
        text_content: Optional[str],
        country: str,
        marketing_type: str,
        nodes: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Validate content either as a single text blob or node-level items.

        If `nodes` is provided, the agent expects a list of objects with
        { node_id, text } and should return issues that may include node_id.
        """
        if not self.client:
            raise Exception(
                "LLM client not available. Check credentials configuration."
            )

        if nodes:
            # Compact nodes payload to reduce token usage
            payload = {
                "marketing_type": marketing_type,
                "country": country,
                "nodes": nodes,
            }
            message = (
                "Please analyze the following list of nodes from an HTML "
                "template. Each node has a node_id and text. Return a JSON "
                "object matching the Output Format in the system prompt. "
                "Include node_id on issues where applicable.\n\n"
                + json.dumps(payload)
            )
        else:
            # Simple full-text validation
            message = (
                f"marketing_type: \"{marketing_type}\"\n"
                f"country: \"{country}\"\n"
                f"content: \"{text_content}\"\n\n"
                "Please analyze this content and validate its compliance "
                "with relevant regulations and best practices."
            )

        self.add_message("user", message)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=self.max_tokens,
        )
        reply = response.choices[0].message.content
        return reply

    def set_system_message(self, content: str):
        """Set the system prompt message."""
        self.messages = []
        self.messages.insert(0, {"role": "system", "content": content})

    def add_message(self, role: str, content: str):
        """Add a message to the conversation history."""
        self.messages.append({"role": role, "content": content})

    # ...existing code...
    @staticmethod
    def read_html_file(html_content: str) -> str:
        soup = BeautifulSoup(html_content, "html.parser")
        text = soup.get_text()
        # Normalize whitespace: replace multiple spaces with single space
        return re.sub(r'\s+', ' ', text).strip()


async def validate_with_llm(
    text_content: Optional[str],
    country: str,
    marketing_type: str,
    nodes: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Use LLM to validate email content quality.

    If `nodes` is provided, forward node-level payload to the agent and
    expect returned issues to optionally include `node_id`.
    """
    try:
        agent = ContentValidationAgent()

        if not agent.client:
            raise Exception("LLM credentials not configured")

        # Run the (blocking) agent.validate_content in a thread with a short
        # timeout so the API doesn't hang on LLM network issues (e.g., 504).
        timeout_seconds = 60
        if nodes:
            # Normalize nodes to only include node_id and text
            simple_nodes = []
            for n in nodes:
                simple_nodes.append(
                    {"node_id": n.get("node_id"), "text": n.get("text") or ""}
                )

            def _call():
                return agent.validate_content(
                    None, country, marketing_type, nodes=simple_nodes
                )

            try:
                llm_response = await asyncio.wait_for(
                    asyncio.to_thread(_call), timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.error(
                    'LLM call timed out after %s seconds', timeout_seconds
                )
                raise Exception('LLM timeout')
        else:
            def _call_full():
                return agent.validate_content(
                    text_content or "", country, marketing_type
                )

            try:
                llm_response = await asyncio.wait_for(
                    asyncio.to_thread(_call_full), timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.error(
                    'LLM call timed out after %s seconds', timeout_seconds
                )
                raise Exception('LLM timeout')

        # Clean up response (remove markdown code blocks if present)
        resp_text = (
            llm_response.strip()
            if isinstance(llm_response, str)
            else llm_response
        )

        # Extract JSON-like content from the LLM reply using helper
        def extract_json_from_llm_response(text: str):
            """Try multiple strategies to pull a JSON/dict/list from LLM text.

            Returns the parsed Python object (dict/list) or raises ValueError.
            """
            def try_json_load(s: str):
                try:
                    return json.loads(s)
                except Exception:
                    return None

            validation_result = None

            # 1) direct load
            if isinstance(text, str):
                validation_result = try_json_load(text)

            # 2) extract largest {...} or [...] block
            if validation_result is None and isinstance(text, str):
                try:
                    candidates = []
                    for m in re.finditer(r"\{[\s\S]*?\}", text):
                        candidates.append(m.group(0))
                    for m in re.finditer(r"\[[\s\S]*?\]", text):
                        candidates.append(m.group(0))
                    candidates = sorted(set(candidates), key=lambda x: -len(x))
                    for c in candidates:
                        maybe = c
                        maybe = re.sub(r',\s*([}\]])', r'\1', maybe)
                        maybe = maybe.replace('“', '"').replace('”', '"')
                        maybe = maybe.replace("‘", "'").replace("’", "'")
                        val = try_json_load(maybe)
                        if val is not None:
                            validation_result = val
                            break
                except Exception:
                    validation_result = None

            # 3) naive single-quote -> double-quote fix
            if validation_result is None and isinstance(text, str):
                try:
                    naive = re.sub(r',\s*([}\]])', r'\1', text)
                    naive = naive.replace('""', '"').replace("'", '"')
                    val = try_json_load(naive)
                    if val is not None:
                        validation_result = val
                except Exception:
                    validation_result = None

            # 4) ast.literal_eval for python-like dicts
            if validation_result is None and isinstance(text, str):
                try:
                    import ast

                    lit = ast.literal_eval(text)
                    validation_result = (
                        lit if isinstance(lit, (dict, list)) else None
                    )
                except Exception:
                    validation_result = None

            if validation_result is None:
                snippet = (text or '')[:1200]
                logger.error('Failed to parse LLM JSON. Snippet: %s', snippet)
                raise ValueError('Failed to parse LLM JSON response')

            return validation_result

        # Attempt to extract the JSON-like result from the LLM reply and
        # normalize it to a list of issues. Any parsing error falls back to
        # an empty list and is logged above in the helper.
        try:
            validation_result = extract_json_from_llm_response(resp_text)
        except Exception as ex:
            logger.error('LLM parse failed: %s', ex)
            validation_result = None

        # The model may return either a dict with an 'issues' key or a
        # bare list of issues. Normalize to a list for callers.
        if isinstance(validation_result, list):
            issues = validation_result
        elif isinstance(validation_result, dict):
            issues = validation_result.get("issues", []) or []
        else:
            issues = []

        logger.info("LLM validation completed: %s issues found", len(issues))
        return issues

    except Exception as e:
        logger.error(f"LLM validation failed: {e}")
        # Fallback to rule-based warnings or empty list
        return [{
            "type": "content",
            "severity": "medium",
            "location": "LLM Analysis",
            "issue": f"LLM validation failed: {str(e)}",
            "suggestion": "Try rule-based validation or check configuration",
            "context": "AI analysis unavailable"
        }]
