"""
Vault secrets utility for validation features.
Standalone version that can be adapted to your backend service.
"""

import os
import json
import logging
from typing import Dict, Optional
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass
class SecretConfig:
    app_name: str
    password: str
    cert_path: str


def set_secrets_map_from_vault():
    """Load secrets from vault-injected file."""
    vault_secret_path = os.getenv(
        "VAULT_SECRET_PATH",
        "/vault/secrets/secrets.json"
    )
    try:
        with open(vault_secret_path) as f:
            secrets = json.load(f)
        log.info(f"Loaded secrets from {vault_secret_path}")
        return secrets
    except FileNotFoundError:
        log.warning(f"Vault secrets file not found at {vault_secret_path}")
        return {}
    except Exception as e:
        log.error(f"Error reading vault secrets: {e}")
        return {}


class SecretUtil:
    """
    Simple utility class for managing vault secrets.
    """

    def __init__(self):
        self.secrets: Dict[str, str] = {}
        self._load_secrets()

    def _load_secrets(self):
        """Load secrets from vault-injected file."""
        log.info("Loading secrets...")

        # Load from vault-injected file
        vault_secrets = set_secrets_map_from_vault()

        # Convert to flat structure for easy access
        self.secrets = {}

        # Add all secrets from vault
        for key, value in vault_secrets.items():
            # Remove common suffixes to get clean key names
            clean_key = key.replace('-secret', '').replace('_secret', '')
            clean_key = clean_key.replace('-', '_')
            self.secrets[clean_key] = str(value)

        # Also add original keys for compatibility
        for key, value in vault_secrets.items():
            self.secrets[key] = str(value)

        # Add environment variables as fallback
        env_secrets = {
            key: value for key, value in os.environ.items()
            if self._is_secret_key(key)
        }

        # Explicitly check for LLM credential keys
        llm_keys = ['app_name', 'password', 'cert', 'app-name', 'cert-path']
        for key in llm_keys:
            if key in os.environ:
                env_secrets[key] = os.environ[key]

        # Environment variables take precedence
        self.secrets.update(env_secrets)

        log.info(f"Loaded {len(self.secrets)} secrets")

    def _is_secret_key(self, key: str) -> bool:
        """Determine if an environment variable key represents a secret."""
        secret_prefixes = ['SECRET_', 'VAULT_', 'DB_', 'API_KEY_', 'TOKEN_']
        secret_suffixes = ['_SECRET', '_KEY', '_TOKEN', '_PASSWORD']

        key_upper = key.upper()
        return (
            any(key_upper.startswith(prefix) for prefix in secret_prefixes) or
            any(key_upper.endswith(suffix) for suffix in secret_suffixes)
        )

    def get_secret_value_for_key(self, key: str) -> Optional[str]:
        """
        Get a secret value by key.

        Args:
            key: The secret key

        Returns:
            The secret value or None if not found
        """
        # Try exact match first
        value = self.secrets.get(key)
        if value:
            return value

        # Try with common variations
        variations = [
            key.replace('-', '_'),
            key.replace('_', '-'),
            f"{key}_secret",
            f"{key}-secret",
            key.lower(),
            key.upper()
        ]

        for variation in variations:
            value = self.secrets.get(variation)
            if value:
                return value

        log.warning(f"Secret '{key}' not found")
        return None


# Global instance
_secret_util: Optional[SecretUtil] = None


def get_secret_util() -> SecretUtil:
    """Get the global SecretUtil instance."""
    global _secret_util
    if _secret_util is None:
        _secret_util = SecretUtil()
    return _secret_util


def get_secret(key: str, default_value: str = None) -> Optional[str]:
    """
    Get a secret value by key from the SecretUtil.

    Args:
        key: The secret key
        default_value: Default value if secret not found

    Returns:
        The secret value or default value
    """
    secret_util = get_secret_util()
    value = secret_util.get_secret_value_for_key(key)

    if value:
        return value

    if default_value is not None:
        return default_value

    return None
