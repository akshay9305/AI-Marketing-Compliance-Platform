"""
Used for retrieving and defining app config.
"""
# pylint: disable=no-self-argument,too-few-public-methods
import logging
import os
from functools import lru_cache
from logging.config import dictConfig as loggingDictConfig
from pathlib import Path
from typing import Literal, Any

from pydantic_settings import BaseSettings
from pythonjsonlogger.jsonlogger import JsonFormatter

# from . import AMS_APPLICATION_NAME_UNDERSCORE
from resource_helper import limit_python_memory

# Define the application name here since we can't import it
AMS_APPLICATION_NAME_UNDERSCORE = "marketing_compliance_platform"

log = logging.getLogger(__name__)


class APPConfig(BaseSettings):
    """
    Any attribute defined below will be pulled from the config file set in the "APP_CONFIG" env var.
    If defined below it must be defined in config. To be used it must be defined.
    """

    app_version: str = "0.1.0"
    limit_python_memory: bool = True

    # == use if needing dynamoDB
    # dynamo_db_endpoint: str | None = None
    # dynamo_region_name: str = "us-west-2"
    # dynamo_table: str

    log_level: Literal[
        "CRITICAL", "FATAL", "ERROR", "WARN", "WARNING", "INFO", "DEBUG"
    ] = "DEBUG"  # pylint: disable=unsubscriptable-object

    # Content Validation LLM Configuration
    llm_app_name: str | None = None
    llm_password: str | None = None
    llm_cert_path: str | None = None
    llm_model: str = "gpt-4o-2024-11-20"
    llm_max_tokens: int = 10000
    llm_base_url: str | None = None

    # Azure OpenAI Configuration (for LLMProxy)
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment_name: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_tiktoken_model_name: str = "gpt-4o-mini"
    azure_openai_embedding_endpoint: str | None = None
    azure_openai_embedding_deployment: str = "text-embedding-ada-002"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """
        This is how you populate the config obj once so that multiple calls do not have to be made.
        Notice we call super before setting our attributes that way we have access to them when we
        go to set our additional attributes that are not defined in the env already (like secrets or
         other network config calls)
        """
        super().__init__(*args, **kwargs)

        self._setup_logging()
        if self.limit_python_memory:
            limit_python_memory()

    def _setup_logging(self) -> None:
        log_dir = "logs"
        Path(log_dir).mkdir(exist_ok=True)
        loggingDictConfig(
            {
                "version": 1,
                "disable_existing_loggers": False,
                'filters': {},
                "formatters": {
                    "standard": {
                        "format": "%(asctime)s - [%(levelname)s] %(name)s [%(module)s.%(funcName)s:%(lineno)d]: %(message)s",
                        "datefmt": "%Y-%m-%d %H:%M:%S",
                        "()": JsonFormatter
                    }
                },
                "handlers": {
                    "default": {
                        "level": "INFO",
                        "class": "logging.StreamHandler",
                        'filters': [],
                        "formatter": "standard",
                        "stream": "ext://sys.stdout",
                    },
                    "rolling_file": {
                        "level": "INFO",
                        "class": "logging.handlers.RotatingFileHandler",
                        'filters': [],
                        "formatter": "standard",
                        "filename": log_dir + "/log.txt",
                        "maxBytes": 1024 * 1024 * 16,  # 16 MB
                        "backupCount": 10,
                    }
                },
                "loggers": {
                    AMS_APPLICATION_NAME_UNDERSCORE: {
                        "level": self.log_level,  # This is the level for our app overall.
                    }
                },
                "root": {
                    "level": "WARN",  # Change this and everything will start screaming at you (all the libs we use)
                    "handlers": ["default", "rolling_file"],
                },
            }
        )


@lru_cache()
def get_config() -> APPConfig:
    """
    Returns the APPConfig object built from the env vars. This function is cached to prevent having to do any I/O
    operation that could slow the app down.
    """
    conf_var = os.getenv("APP_CONFIG")
    if not conf_var:
        raise EnvironmentError('Environment variable "APP_CONFIG" is not set.')
    path = os.getenv("APP_CONFIG_PATH", "config")
    env_path = Path(path, conf_var)
    
    # If the exact config file doesn't exist, try the .example version
    if not env_path.is_file():
        example_path = Path(path, f"{conf_var}.example")
        if example_path.is_file():
            log.warning(f"Config file '{env_path}' not found, using '{example_path}' as fallback")
            env_path = example_path
        else:
            raise FileNotFoundError(f"Could not find config file '{env_path}' or '{example_path}' from cwd='{os.getcwd()}'")
    
    conf = APPConfig(_env_file=env_path)
    return conf
