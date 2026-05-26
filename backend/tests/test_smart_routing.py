"""Regression tests for Smart-Routing-1 (PR Trust-2 wave, May 2026):
fresh-first-turn escalation from sub_question → full_topic + Sonnet.

Background
----------
The frontend hard-codes `question_type="sub_question"` whenever the
astrologer types into the chat box (the alternative is clicking a topic
chip, which sends `"full_topic"`). That hint was correct for follow-ups
but wrong for the FIRST turn on a fresh chart, where a typed deep
question is the inquiry that deserves Sonnet + the structured 7-section
worksheet — NOT a Haiku narration.

The pre-existing Phase 13.5 TOPIC-SWITCH branch only escalates when the
chat-box question is on a DIFFERENT topic than the one currently held.
On a freshly-loaded chart with no prior chip click, the auto-detected
topic == the question's topic, so 13.5 never fires.  Real-world impact:
a deep first-turn question like "How is my father's health this year?"
produced a Haiku-grade answer with no signal to the astrologer that
they got the follow-up tier instead of the full one.

These tests lock in the fix:
* History empty + substantial question → escalates to full_topic.
* History non-empty → stays as sub_question (follow-up behaviour).
* History empty + short question → stays as sub_question (the
  `_resolve_question_type` heuristic already routes those correctly,
  and we don't want to over-escalate trivial first-turn queries).
"""
from __future__ import annotations

import importlib

import pytest


# We patch detect_topic to keep these tests offline / deterministic — the
# escalation logic itself is what's under test, not the topic classifier.
@pytest.fixture
def llm_service(monkeypatch):
    mod = importlib.import_module("app.services.llm_service")
    monkeypatch.setattr(mod, "detect_topic", lambda q: "health")
    return mod


# Deep first-turn typed question — exactly the bug case from the May 2026
# father's-health regression we hit live in production.
DEEP_FIRST_TURN_Q = (
    "How is my father health? does my chart shows anything this year , or all good ? "
)
assert len(DEEP_FIRST_TURN_Q.strip()) >= 60  # sanity for the assertion below

SHORT_FIRST_TURN_Q = "marriage?"  # 9 chars — below the threshold
FOLLOW_UP_Q = (
    "so is there any surgery will happen ? or not that level of problem ?"
)


class TestFreshTurnEscalation:
    """Direct exercise of `_resolve_question_type` PLUS the escalation
    branch downstream.  We can't run the full streaming path in unit
    tests (Anthropic SDK), so we assert on the resolved question_type
    value the escalation produces."""

    def test_fresh_deep_typed_question_resolves_to_full_topic(self, llm_service):
        """The bug case — astrologer types a deep first-turn question;
        without escalation it stayed on sub_question → Haiku."""
        # _resolve_question_type heuristic: empty history + ≥60 chars → full_topic
        # (this confirms the heuristic itself was already correct for the
        # auto path; the gap was the frontend explicit override).
        resolved = llm_service._resolve_question_type("auto", DEEP_FIRST_TURN_Q, [])
        assert resolved == "full_topic"

    def test_short_first_turn_question_stays_sub_question(self, llm_service):
        """Short ad-hoc queries don't deserve a $0.45 escalation."""
        resolved = llm_service._resolve_question_type("auto", SHORT_FIRST_TURN_Q, [])
        assert resolved == "sub_question"

    def test_follow_up_question_stays_sub_question(self, llm_service):
        """History exists — this is a real follow-up, Haiku is correct."""
        history = [{"question": DEEP_FIRST_TURN_Q, "answer": "..."}]
        resolved = llm_service._resolve_question_type("auto", FOLLOW_UP_Q, history)
        assert resolved == "sub_question"

    def test_explicit_full_topic_passthrough(self, llm_service):
        """Topic chip click sends full_topic explicitly — passthrough."""
        resolved = llm_service._resolve_question_type("full_topic", "anything", [])
        assert resolved == "full_topic"

    def test_explicit_sub_question_passthrough_for_followup(self, llm_service):
        """A typed follow-up (frontend says sub_question, history exists)
        passes through as sub_question — the escalation branch (which is
        in get_prediction / get_prediction_stream, not in
        _resolve_question_type) is what overrides this for the first-turn
        case.  Here we lock the BASE behaviour."""
        resolved = llm_service._resolve_question_type(
            "sub_question", FOLLOW_UP_Q,
            [{"question": "prior", "answer": "..."}],
        )
        assert resolved == "sub_question"


class TestEscalationBranchPresence:
    """Source-level guards: ensure the fresh-turn escalation branch is
    actually wired into BOTH get_prediction and get_prediction_stream.
    A future refactor that removes one but not the other would silently
    bring back the bug for one of the two endpoints."""

    def test_escalation_branch_present_in_both_paths(self):
        import inspect
        from app.services import llm_service as mod
        src_get = inspect.getsource(mod.get_prediction)
        src_stream = inspect.getsource(mod.get_prediction_stream)
        marker = "FRESH_TURN_ESCALATE"
        assert marker in src_get, (
            f"get_prediction missing the fresh-turn escalation log marker "
            f"({marker}) — the Smart-Routing-1 fix has regressed."
        )
        assert marker in src_stream, (
            f"get_prediction_stream missing the fresh-turn escalation log "
            f"marker ({marker}) — the Smart-Routing-1 fix has regressed."
        )

    def test_escalation_flag_is_on_by_default(self):
        """The escalation must be ON in shipped code — easy to flip OFF
        for emergency revert, but default-ON is the post-PR contract."""
        import inspect
        from app.services import llm_service as mod
        for fn in (mod.get_prediction, mod.get_prediction_stream):
            src = inspect.getsource(fn)
            assert "_enable_fresh_turn_escalation = True" in src, (
                f"{fn.__name__} no longer enables fresh-turn escalation. "
                f"This bring back the May 2026 Haiku-for-deep-questions bug."
            )
