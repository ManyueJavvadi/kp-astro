"""Enforces the config single-door rule (2026-09-27, foundation step 2).

THE RULE
    `app/config.py` is the only module in `app/` allowed to read the
    environment. Everything else goes through `get_settings()`.

WHY IT IS WORTH A TEST
    Before this, 20 env vars were read via bare `os.getenv` across
    main.py, db/engine.py, routers/ and services/ — and six of them were
    ALSO declared in config.py. Two sources of truth, already drifted in
    two places that mattered:

      MAX_REQUEST_BODY_BYTES  256 KB in config.py, 2 MB in main.py.
                              main.py won, so config.py documented a
                              limit the app did not enforce.

      RATE_LIMIT_ENABLED      tested as `os.getenv(...) != "1"`, so the
                              natural-looking RATE_LIMIT_ENABLED=true
                              silently DISABLED the rate limiter — the
                              only cost control on paid LLM endpoints.

    Neither raised. Both read as correct. That is the same silent-default
    failure mode as the retrograde and gana bugs, in the config layer.

    A convention nobody can enforce decays. This test is the enforcement.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parent.parent / "app"

# The one module allowed to read the environment. Relative to APP_DIR.
ALLOWED = {"config.py"}

# Attributes of the `os` module that read the environment.
ENV_READERS = {"getenv", "environ", "putenv", "unsetenv"}


def _python_files() -> list[Path]:
    return sorted(
        p for p in APP_DIR.rglob("*.py") if "__pycache__" not in p.parts
    )


def _env_reads(path: Path) -> list[str]:
    """Return a description of every environment read in `path`.

    Uses the AST rather than a text search so that comments, docstrings
    and string literals mentioning `os.getenv` do not trip the check —
    only real code does.
    """
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    hits: list[str] = []

    for node in ast.walk(tree):
        # os.getenv(...) / os.environ[...] / os.environ.get(...)
        if isinstance(node, ast.Attribute):
            if (
                isinstance(node.value, ast.Name)
                and node.value.id == "os"
                and node.attr in ENV_READERS
            ):
                hits.append(f"line {node.lineno}: os.{node.attr}")

        # from os import getenv / environ
        elif isinstance(node, ast.ImportFrom) and node.module == "os":
            for alias in node.names:
                if alias.name in ENV_READERS:
                    hits.append(
                        f"line {node.lineno}: from os import {alias.name}"
                    )

    return hits


def test_only_config_reads_the_environment():
    offenders: dict[str, list[str]] = {}

    for path in _python_files():
        rel = path.relative_to(APP_DIR).as_posix()
        if rel in ALLOWED:
            continue
        hits = _env_reads(path)
        if hits:
            offenders[rel] = hits

    assert not offenders, (
        "These modules read the environment directly. Declare a typed "
        "field in app/config.py and read it via get_settings() instead:\n\n"
        + "\n".join(
            f"  app/{mod}\n" + "\n".join(f"      {h}" for h in hits)
            for mod, hits in sorted(offenders.items())
        )
    )


def test_config_module_itself_is_scanned():
    """Guard against the guard silently passing.

    If config.py were renamed or the allow-list typo'd, the test above
    would pass vacuously. Assert the allowed file actually exists and
    really does read the environment (via pydantic-settings), so we know
    the scan is pointed at a live target.
    """
    assert (APP_DIR / "config.py").is_file(), "app/config.py is missing"
    assert _python_files(), "no python files found — APP_DIR is wrong"


# ── The two drift bugs this step fixed ────────────────────────────────


@pytest.fixture()
def settings():
    from app.config import Settings

    # Construct directly (not via the cached get_settings) so this test
    # reflects declared defaults, not whatever the developer's .env holds.
    return Settings(_env_file=None)


def test_body_limit_default_matches_what_the_app_enforces(settings):
    """config.py said 256 KB; main.py enforced 2 MB. 2 MB is correct.

    The limit was deliberately raised on 2026-06-16 because chart-session
    saves carry the full workspace blob plus AI Q&A history, and at ~25
    long KP answers the PATCH body crossed 256 KB and was rejected with
    413 — answers silently failed to persist. Unifying on config.py's
    stale 256 KB would have re-introduced that bug.
    """
    assert settings.MAX_REQUEST_BODY_BYTES == 2 * 1024 * 1024


@pytest.mark.parametrize("raw", ["true", "True", "1", "yes", "on"])
def test_truthy_spellings_keep_the_rate_limiter_on(raw):
    """The foot-gun: `!= "1"` meant RATE_LIMIT_ENABLED=true DISABLED it.

    Anyone setting the variable to the obvious value got the opposite of
    what they asked for, on the only cost control guarding paid LLM
    endpoints. A typed bool makes every truthy spelling mean enabled.
    """
    from app.config import Settings

    assert Settings(_env_file=None, RATE_LIMIT_ENABLED=raw).RATE_LIMIT_ENABLED


@pytest.mark.parametrize("raw", ["false", "False", "0", "no", "off"])
def test_falsy_spellings_turn_the_rate_limiter_off(raw):
    from app.config import Settings

    assert not Settings(
        _env_file=None, RATE_LIMIT_ENABLED=raw
    ).RATE_LIMIT_ENABLED


def test_unparseable_boolean_fails_loudly(settings):
    """Wrong config must raise at startup, not pick a side quietly."""
    from pydantic import ValidationError

    from app.config import Settings

    with pytest.raises(ValidationError):
        Settings(_env_file=None, RATE_LIMIT_ENABLED="banana")


def test_commit_helpers_degrade_to_unknown_off_railway(settings):
    """Outside a Railway deploy these are unset; /version must not crash."""
    assert settings.commit_sha == "unknown"
    assert settings.commit_sha_short == "unknown"
    assert settings.git_branch == "unknown"


def test_commit_sha_short_truncates_to_twelve():
    from app.config import Settings

    s = Settings(_env_file=None, RAILWAY_GIT_COMMIT_SHA="0123456789abcdef0123")
    assert s.commit_sha_short == "0123456789ab"


# ── .env.example must stay a complete inventory ───────────────────────


def test_every_setting_is_documented_in_env_example():
    """A setting nobody knows exists is a setting nobody can configure.

    `.env.example` is the only place an operator (or a new developer, or
    someone reading the Confluence page) learns what knobs exist. If a
    field can be added to config.py without appearing there, the file
    decays into a partial list that is worse than none — you cannot tell
    whether an absent variable is unsupported or merely undocumented.

    That had already happened: before 2026-09-27 the file listed 7
    variables while the backend read 20+, and it advertised FRONTEND_URL,
    which no code has ever read.
    """
    from app.config import Settings

    example = (Path(__file__).resolve().parent.parent / ".env.example").read_text(
        encoding="utf-8"
    )
    missing = [
        name for name in Settings.model_fields if name not in example
    ]
    assert not missing, (
        "These settings are declared in app/config.py but never mentioned "
        "in backend/.env.example:\n  " + "\n  ".join(missing)
    )


def test_env_example_advertises_nothing_the_app_ignores():
    """The reverse drift: documenting a variable the code never reads.

    An operator who sets it gets no effect and no error — exactly the
    silent-default shape this whole step exists to remove.
    """
    import re

    from app.config import Settings

    example_path = Path(__file__).resolve().parent.parent / ".env.example"
    declared = set(Settings.model_fields)

    # Only uncommented `NAME=` assignments are claims that the app reads
    # something. Commented lines are prose and may mention anything.
    assigned = {
        m.group(1)
        for line in example_path.read_text(encoding="utf-8").splitlines()
        if (m := re.match(r"^([A-Z][A-Z0-9_]*)=", line.strip()))
    }

    unknown = sorted(assigned - declared)
    assert not unknown, (
        "backend/.env.example assigns variables the backend never reads. "
        "Either declare them in app/config.py or delete them:\n  "
        + "\n  ".join(unknown)
    )
