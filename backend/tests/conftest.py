"""Pytest config — ensures the backend package is importable from tests/."""
import os
import sys

# Add backend/ to sys.path so `import app.services...` works from tests/.
_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)
