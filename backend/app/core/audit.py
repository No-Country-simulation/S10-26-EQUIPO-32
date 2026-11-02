"""Structured Security Audit Logging Module.

Adheres to:
- NIST CSF 2.0: DE.AE-01, DE.CM-01
- OWASP A09: Security Logging and Monitoring Failures
- ISO/IEC 27001: A.12.4 Logging and Monitoring
Provides structured audit events, automatic credential redaction,
and queryable audit trails.
"""

from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
import uuid
from backend.app.core.sanitizer import redact_secrets


# Configure Python logger for OpenBridge Audit
logger = logging.getLogger("openbridge.audit")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        fmt='%(asctime)s [AUDIT] %(message)s',
        datefmt='%Y-%m-%dT%H:%M:%SZ'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class AuditEvent:
    """Represents an immutable, normalized audit log record."""

    def __init__(
        self,
        action: str,
        actor: str,
        resource: str,
        status: str,
        ip_address: Optional[str] = None,
        role: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None,
        timestamp: Optional[str] = None,
    ):
        self.id = event_id or str(uuid.uuid4())
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.action = action
        self.actor = actor
        self.role = role or "anonymous"
        self.resource = resource
        self.status = status  # 'SUCCESS', 'DENIED', 'FAILURE', 'WARNING'
        self.ip_address = ip_address or "127.0.0.1"
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Converts audit event to dictionary with redacted secrets."""
        raw_dict = {
            "id": self.id,
            "timestamp": self.timestamp,
            "action": self.action,
            "actor": self.actor,
            "role": self.role,
            "resource": self.resource,
            "status": self.status,
            "ip_address": self.ip_address,
            "details": self.details,
        }
        # Serialize and redact any sensitive token pattern
        serialized = json.dumps(raw_dict, default=str)
        redacted = redact_secrets(serialized)
        return json.loads(redacted)


class AuditLogger:
    """Manages emission and query of audit events."""

    def __init__(self, max_in_memory: int = 1000):
        self._max_in_memory = max_in_memory
        self._events: List[Dict[str, Any]] = []

    def log(
        self,
        action: str,
        actor: str,
        resource: str,
        status: str,
        ip_address: Optional[str] = None,
        role: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Emits an audit log event, records it in the memory buffer and outputs to stdout."""
        event = AuditEvent(
            action=action,
            actor=actor,
            resource=resource,
            status=status,
            ip_address=ip_address,
            role=role,
            details=details,
        )
        data = event.to_dict()

        # Append to buffer with bounded size
        self._events.append(data)
        if len(self._events) > self._max_in_memory:
            self._events.pop(0)

        # Log formatted JSON string
        logger.info(json.dumps(data))
        return data

    def get_recent_events(self, limit: int = 50, action_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns recent audit events, newest first."""
        events = list(reversed(self._events))
        if action_filter:
            events = [e for e in events if e.get("action") == action_filter]
        return events[:limit]

    def clear(self) -> None:
        """Clears memory buffer (for unit test isolation)."""
        self._events.clear()


# Global audit logger singleton
audit_logger = AuditLogger()

