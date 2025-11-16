"""
Mock Memory Store

In-memory cache for demo/testing without Redis.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class MockMemoryStore:
    """
    Mock memory store that provides Redis-like caching in memory.

    In production, this would be replaced with Redis.
    """

    def __init__(self, key_prefix: str = "ca_factory:"):
        """
        Initialize mock memory store.

        Args:
            key_prefix: Prefix for all keys
        """
        self.key_prefix = key_prefix
        self._store: Dict[str, Dict[str, Any]] = {}

        logger.info(f"Mock memory store initialized with prefix: {key_prefix}")

    def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> None:
        """
        Set a key-value pair with optional TTL.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl_seconds: Time to live in seconds
        """
        full_key = self.key_prefix + key

        expires_at = None
        if ttl_seconds:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)

        self._store[full_key] = {
            "value": json.dumps(value) if not isinstance(value, str) else value,
            "expires_at": expires_at,
            "created_at": datetime.utcnow()
        }

        logger.debug(f"Set key: {full_key} (TTL: {ttl_seconds}s)")

    def get(self, key: str) -> Optional[Any]:
        """
        Get value by key.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found or expired
        """
        full_key = self.key_prefix + key

        if full_key not in self._store:
            return None

        entry = self._store[full_key]

        # Check if expired
        if entry["expires_at"] and datetime.utcnow() > entry["expires_at"]:
            del self._store[full_key]
            logger.debug(f"Key expired: {full_key}")
            return None

        value = entry["value"]

        # Try to deserialize JSON
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value

    def delete(self, key: str) -> bool:
        """
        Delete a key.

        Args:
            key: Cache key

        Returns:
            True if key existed and was deleted
        """
        full_key = self.key_prefix + key

        if full_key in self._store:
            del self._store[full_key]
            logger.debug(f"Deleted key: {full_key}")
            return True

        return False

    def exists(self, key: str) -> bool:
        """
        Check if key exists and is not expired.

        Args:
            key: Cache key

        Returns:
            True if key exists and is not expired
        """
        return self.get(key) is not None

    def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment a numeric value.

        Args:
            key: Cache key
            amount: Amount to increment by

        Returns:
            New value after increment
        """
        current = self.get(key)

        if current is None:
            new_value = amount
        else:
            new_value = int(current) + amount

        self.set(key, new_value)

        return new_value

    def expire(self, key: str, ttl_seconds: int) -> bool:
        """
        Set TTL on an existing key.

        Args:
            key: Cache key
            ttl_seconds: Time to live in seconds

        Returns:
            True if TTL was set
        """
        full_key = self.key_prefix + key

        if full_key not in self._store:
            return False

        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        self._store[full_key]["expires_at"] = expires_at

        logger.debug(f"Set TTL on key: {full_key} ({ttl_seconds}s)")

        return True

    def clear_all(self) -> None:
        """Clear all keys from the store."""
        self._store.clear()
        logger.info("Memory store cleared")

    def clear_expired(self) -> int:
        """
        Remove all expired keys.

        Returns:
            Number of keys removed
        """
        now = datetime.utcnow()
        expired_keys = []

        for key, entry in self._store.items():
            if entry["expires_at"] and now > entry["expires_at"]:
                expired_keys.append(key)

        for key in expired_keys:
            del self._store[key]

        if expired_keys:
            logger.debug(f"Cleared {len(expired_keys)} expired keys")

        return len(expired_keys)

    def get_keys(self, pattern: Optional[str] = None) -> list[str]:
        """
        Get all keys, optionally filtered by pattern.

        Args:
            pattern: Key pattern (simple substring match)

        Returns:
            List of matching keys
        """
        if pattern is None:
            return list(self._store.keys())

        return [
            key for key in self._store.keys()
            if pattern in key
        ]

    def get_stats(self) -> Dict[str, Any]:
        """Get memory store statistics."""
        total_keys = len(self._store)
        expired_count = 0

        now = datetime.utcnow()
        for entry in self._store.values():
            if entry["expires_at"] and now > entry["expires_at"]:
                expired_count += 1

        return {
            "type": "mock",
            "key_prefix": self.key_prefix,
            "total_keys": total_keys,
            "expired_keys": expired_count,
            "active_keys": total_keys - expired_count
        }

    def set_hash(self, key: str, field: str, value: Any) -> None:
        """
        Set a field in a hash.

        Args:
            key: Hash key
            field: Field name
            value: Field value
        """
        hash_data = self.get(key) or {}

        if not isinstance(hash_data, dict):
            hash_data = {}

        hash_data[field] = value
        self.set(key, hash_data)

    def get_hash(self, key: str, field: str) -> Optional[Any]:
        """
        Get a field from a hash.

        Args:
            key: Hash key
            field: Field name

        Returns:
            Field value or None
        """
        hash_data = self.get(key)

        if not hash_data or not isinstance(hash_data, dict):
            return None

        return hash_data.get(field)

    def get_all_hash(self, key: str) -> Dict[str, Any]:
        """
        Get all fields from a hash.

        Args:
            key: Hash key

        Returns:
            Dictionary of all fields
        """
        hash_data = self.get(key)

        if not hash_data or not isinstance(hash_data, dict):
            return {}

        return hash_data
