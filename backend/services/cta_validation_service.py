"""
CTA Validation Service for validating call-to-action links
"""
import os
import logging
import json
import asyncio
from typing import Dict, List, Any, Optional
from concurrent.futures import ProcessPoolExecutor
from bs4 import BeautifulSoup

from config import get_config
from services.llm_proxy import LLMProxy

logger = logging.getLogger(__name__)


def _scrape_cta_page_standalone(url: str, auth_file: str) -> Dict[str, Any]:
    """Standalone function to scrape a CTA page"""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {
            "title": "Error",
            "headers": [],
            "body": "Playwright not installed. Run: pip install playwright"
        }

    with sync_playwright() as p:
        display_available = os.environ.get('DISPLAY') or os.name == 'nt'
        headless_mode = not display_available

        browser = p.chromium.launch(headless=headless_mode)

        if os.path.exists(auth_file):
            context = browser.new_context(storage_state=auth_file)
        else:
            context = browser.new_context()

        page = context.new_page()

        page.set_viewport_size({"width": 1920, "height": 1080})
        page.set_extra_http_headers({
            "Accept": "text/html,application/xhtml+xml,"
            "application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })

        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")

            page.wait_for_timeout(2000)
            page.mouse.move(100, 100)
            page.wait_for_timeout(1000)
            page.evaluate(
                "window.scrollTo(0, document.body.scrollHeight / 4)"
            )
            page.wait_for_timeout(1500)

            scraped = {
                "title": page.title(),
                "headers": [
                    h.inner_text()
                    for h in page.query_selector_all("h1, h2, h3")
                ],
                "body": page.inner_text("body")[:2000]
            }
        except Exception as e:
            scraped = {
                "title": "Error",
                "headers": [],
                "body": f"Failed to scrape: {str(e)}"
            }
        finally:
            browser.close()

        return scraped


class CTAValidatorAgent:
    """
    A class for CTA validation using LLM.
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
            logger.info("CTAValidatorAgent initialized with LLM")
        except Exception as e:
            logger.warning(f"Failed to initialize LLM client: {e}")
            self.client = None

        if system_message:
            self.set_system_message(system_message)
        else:
            self._set_default_system_message()

    def _set_default_system_message(self):
        default_message = (
            "You are an expert CTA links and content validator for a "
            "multinational manufacturer of confectionery, pet food, and other food products(Mars).\n\n"
            "User will provide CTA information:\n"
            "1. cta_text: The visible text of the CTA link/button\n"
            "2. cta_url: The URL the CTA points to\n"
            "3. scraped_title: The title of the page\n"
            "4. scraped_headers: The main headers from the CTA page\n"
            "5. scraped_body_snippet: First 2000 characters of body text\n\n"
            "Analyze the CTA information and provide a JSON response.\n\n"
            "Respond ONLY with valid JSON in this format:\n"
            "{\n"
            '  "analysis": "Your analysis in 100-150 words. 👍 or 👎"\n'
            "}\n"
        )
        self.set_system_message(default_message)

    def set_system_message(self, content: str):
        self.messages = []
        self.messages.insert(0, {"role": "system", "content": content})

    def add_message(self, role: str, content: str):
        self.messages.append({"role": role, "content": content})

    def validate_content(self, cta_info: str) -> str:
        if not self.client:
            raise Exception("LLM client not available.")

        message = f"""
CTA Information:
{cta_info}

Please analyze this CTA information and identify quality issues."""

        self.add_message("user", message)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=self.max_tokens,
        )
        return response.choices[0].message.content


class CTAValidationService:
    def __init__(self):
        self.auth_file = "auth_state.json"

    def extract_cta_links_from_html(self, html_content: str) -> Dict[str, str]:
        """Extract CTA links from HTML content"""
        soup = BeautifulSoup(html_content, 'html.parser')
        ctas = {}

        logger.info(f"Parsing HTML content (length: {len(html_content)})")

        all_links = soup.find_all('a', href=True)

        for link in all_links:
            href = link['href'].strip()
            text = link.get_text().strip()

            if not href or href.startswith('#') or not text:
                continue

            text = ' '.join(text.split())

            if text and href:
                ctas[text] = href

        logger.info(f"Found {len(ctas)} CTAs")
        return ctas

    def scrape_cta_page(self, url: str) -> Dict[str, Any]:
        """Scrape a CTA page using browser"""
        return _scrape_cta_page_standalone(url, self.auth_file)

    async def validate_ctas(
        self,
        html_content: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Validate CTAs from HTML content"""
        ctas = self.extract_cta_links_from_html(html_content)

        if limit:
            ctas = dict(list(ctas.items())[:limit])

        results = []
        loop = asyncio.get_event_loop()

        for i, (cta_text, cta_url) in enumerate(ctas.items()):
            try:
                logger.info(f"Processing CTA {i+1}/{len(ctas)}: {cta_text}")

                with ProcessPoolExecutor() as executor:
                    scraped = await loop.run_in_executor(
                        executor,
                        _scrape_cta_page_standalone,
                        cta_url,
                        self.auth_file
                    )

                result = {
                    "cta_text": cta_text,
                    "cta_url": cta_url,
                    "scraped_title": scraped['title'],
                    "scraped_headers": scraped['headers'],
                    "scraped_body_snippet": scraped['body']
                }

                try:
                    agent = CTAValidatorAgent()

                    if not agent.client:
                        raise Exception("LLM credentials not configured")

                    llm_response = agent.validate_content(str(result))

                    if llm_response.startswith("```json"):
                        llm_response = llm_response[7:]
                    if llm_response.endswith("```"):
                        llm_response = llm_response[:-3]

                    validation_result = json.loads(llm_response.strip())
                    result['llm_validation'] = (
                        validation_result.get("analysis", "")
                    )
                    logger.info(
                        f"LLM validation completed for CTA '{cta_text}'"
                    )
                except Exception as e:
                    logger.error(
                        f"LLM validation failed for CTA '{cta_text}': {e}"
                    )
                    result['llm_validation'] = {
                        "error": f"LLM validation failed: {str(e)}"
                    }

                results.append(result)

                if i < len(ctas) - 1:
                    await asyncio.sleep(3)

            except Exception as e:
                logger.error(f"Error processing CTA {cta_text}: {e}")
                result = {
                    "cta_text": cta_text,
                    "cta_url": cta_url,
                    "scraped_title": "Error",
                    "scraped_headers": [],
                    "scraped_body_snippet": "",
                    "llm_validation": "LLM validation skipped due to error",
                    "error": str(e)
                }
                results.append(result)

        return results

    def capture_authentication(
        self,
        signin_url: str,
        wait_time: int = 30
    ) -> Dict[str, Any]:
        """Capture authentication state by opening browser for user login"""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            return {
                "status": "error",
                "message": "Playwright not installed",
                "auth_file": None
            }

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=False)
                context = browser.new_context()
                page = context.new_page()

                page.set_extra_http_headers({
                    "Accept": "text/html,application/xhtml+xml,"
                    "application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
                })

                logger.info(f"Opening browser for auth at: {signin_url}")
                page.goto(
                    signin_url,
                    timeout=60000,
                    wait_until="domcontentloaded"
                )

                logger.info(f"Waiting {wait_time}s for user authentication...")
                page.wait_for_timeout(wait_time * 1000)

                context.storage_state(path=self.auth_file)
                logger.info(f"Auth state saved to: {self.auth_file}")

                browser.close()

                return {
                    "status": "success",
                    "message": "Authentication captured successfully",
                    "auth_file": self.auth_file
                }

        except Exception as e:
            logger.error(f"Authentication capture failed: {e}")
            return {
                "status": "error",
                "message": f"Authentication capture failed: {str(e)}",
                "auth_file": None
            }

    def save_auth_state_from_frontend(
        self,
        auth_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Save authentication state received from frontend"""
        try:
            with open(self.auth_file, 'w') as f:
                json.dump(auth_data, f, indent=2)

            logger.info(f"Auth state saved from frontend to: {self.auth_file}")

            return {
                "status": "success",
                "message": "Authentication state saved successfully",
                "auth_file": self.auth_file
            }

        except Exception as e:
            logger.error(f"Failed to save auth state: {e}")
            return {
                "status": "error",
                "message": f"Failed to save authentication state: {str(e)}",
                "auth_file": None
            }
