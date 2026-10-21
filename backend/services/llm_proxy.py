from langchain_openai import AzureChatOpenAI
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv
from dataclasses import dataclass
from typing import List

load_dotenv()


# OpenAI-compatible response wrapper classes
@dataclass
class Message:
    content: str
    role: str = "assistant"


@dataclass
class Choice:
    message: Message
    finish_reason: str = "stop"
    index: int = 0


@dataclass
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class ChatCompletion:
    choices: List[Choice]
    usage: Usage
    model: str = ""
    id: str = ""
    object: str = "chat.completion"


class LLMSingletonClient:
    chat_client = None
    embedding_client = None

    @classmethod
    def get_chat_client(cls):
        if cls.chat_client is None:
            # Use different parameters based on API version
            api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
            deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", os.getenv("DEPLOYMENT_NAME", "gpt-4o-mini"))

            if api_version >= "2024-12-01" and "o4" in deployment_name.lower():
                # o4 models have specific requirements
                cls.chat_client = AzureChatOpenAI(
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                    deployment_name=deployment_name,
                    openai_api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                    openai_api_version=api_version,
                    tiktoken_model_name=os.getenv("AZURE_OPENAI_TIKTOKEN_MODEL_NAME", "gpt-4o-mini"),
                    temperature=1,  # o4 models only support temperature=1
                    max_tokens=4000
                )
            elif api_version >= "2024-12-01":
                # Newer API versions use max_completion_tokens
                cls.chat_client = AzureChatOpenAI(
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                    deployment_name=deployment_name,
                    openai_api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                    openai_api_version=api_version,
                    tiktoken_model_name=os.getenv("AZURE_OPENAI_TIKTOKEN_MODEL_NAME", "gpt-4o-mini"),
                    temperature=0.3,
                    max_tokens=4000
                )
            else:
                # Older API versions use max_tokens
                cls.chat_client = AzureChatOpenAI(
                    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                    deployment_name=deployment_name,
                    openai_api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                    openai_api_version=api_version,
                    tiktoken_model_name=os.getenv("AZURE_OPENAI_TIKTOKEN_MODEL_NAME", "gpt-4o-mini"),
                    temperature=0.3,
                    max_tokens=4000
                )
        return cls.chat_client

    @classmethod
    def get_embedding_client(cls):
        if cls.embedding_client is None:
            cls.embedding_client = AzureOpenAIEmbeddings(
                azure_endpoint=os.getenv("AZURE_OPENAI_EMBEDDING_ENDPOINT", os.getenv("EMBEDDING_ENDPOINT_URL")),
                deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", os.getenv("EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")),
                openai_api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
            )
        return cls.embedding_client


class ChatCompletions:
    """Mimics OpenAI's chat.completions interface"""

    def __init__(self, llm_client):
        self._client = llm_client

    def create(self, messages, model=None, temperature=None,
               max_tokens=None, **kwargs):
        """
        Create a completion using LangChain Azure OpenAI client.
        Returns OpenAI-compatible ChatCompletion object.
        """
        try:
            # Convert OpenAI message format to LangChain format
            langchain_messages = []
            for msg in messages:
                if msg["role"] == "system":
                    langchain_messages.append(
                        SystemMessage(content=msg["content"])
                    )
                elif msg["role"] == "user":
                    langchain_messages.append(
                        HumanMessage(content=msg["content"])
                    )
                elif msg["role"] == "assistant":
                    # Skip assistant messages for now
                    continue

            # Use invoke method
            response = self._client.invoke(langchain_messages)

            # Return OpenAI-compatible ChatCompletion object
            return ChatCompletion(
                choices=[
                    Choice(
                        message=Message(
                            content=response.content,
                            role="assistant"
                        ),
                        finish_reason="stop",
                        index=0
                    )
                ],
                usage=Usage(
                    prompt_tokens=0,
                    completion_tokens=0,
                    total_tokens=0
                ),
                model=model or ""
            )

        except Exception as e:
            raise Exception(f"LLM Proxy error: {str(e)}")


class Chat:
    """Mimics OpenAI's chat interface"""

    def __init__(self, llm_client):
        self.completions = ChatCompletions(llm_client)


class LLMProxy:
    """
    Proxy class providing OpenAI-compatible interface using
    LangChain Azure OpenAI. Use like: client.chat.completions.create(...)
    """

    def __init__(self):
        self._llm_client = LLMSingletonClient.get_chat_client()
        self.chat = Chat(self._llm_client)

    def create_completion(self, messages, model=None,
                          temperature=None, max_tokens=None, **kwargs):
        """
        Legacy method - use chat.completions.create() instead.
        Kept for backward compatibility.
        """
        return self.chat.completions.create(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs
        )


