"""ORM models — collected here so `from app.db import models` populates
Base.metadata for Alembic autogenerate.

Adding a new model:
  1. Create `app/db/models/your_model.py`
  2. Add `from .your_model import YourModel` below
  3. Run `alembic revision --autogenerate -m "add your_model"`
  4. Inspect the generated migration before applying

Listed in dependency order (parents before children) for readability.
SQLAlchemy doesn't care about import order — relationships resolve
lazily via string references.
"""

from .astrologer import Astrologer
from .client import Client
from .chart_session import ChartSession
from .client_note import ClientNote
from .subscription import Subscription
from .usage_event import UsageEvent
from .audit_log import AuditLog

__all__ = [
    "Astrologer",
    "Client",
    "ChartSession",
    "ClientNote",
    "Subscription",
    "UsageEvent",
    "AuditLog",
]
