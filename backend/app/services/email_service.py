"""
Transactional email via Resend (https://resend.com).

Env gated:
  RESEND_API_KEY      — required to actually send
  RESEND_FROM         — e.g. "DevAstroAI <hello@devastro.ai>"
  APP_URL             — base URL used in email links

If RESEND_API_KEY is missing the functions log and no-op so local dev doesn't
blow up.

We use httpx directly (already a dep) instead of pulling in `resend` SDK —
one less package, one less lockfile churn.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


def _api_key() -> str | None:
    return os.getenv("RESEND_API_KEY")


def _from_addr() -> str:
    return os.getenv("RESEND_FROM", "DevAstroAI <hello@devastro.ai>")


def _app_url() -> str:
    return os.getenv("APP_URL", "http://localhost:3002").rstrip("/")


async def _send(
    to: str,
    subject: str,
    html: str,
    *,
    text: str | None = None,
    reply_to: str | None = None,
    tag: str | None = None,
) -> dict[str, Any] | None:
    """Low-level send. Returns Resend response JSON or None if disabled."""
    key = _api_key()
    if not key:
        log.info("email: RESEND_API_KEY unset; skipping %s → %s", subject, to)
        return None

    payload: dict[str, Any] = {
        "from": _from_addr(),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text
    if reply_to:
        payload["reply_to"] = reply_to
    if tag:
        payload["tags"] = [{"name": "category", "value": tag}]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                RESEND_URL,
                json=payload,
                headers={"Authorization": f"Bearer {key}"},
            )
            if res.status_code >= 400:
                log.warning(
                    "email: resend %s returned %s: %s",
                    tag or "transactional",
                    res.status_code,
                    res.text[:500],
                )
                return None
            return res.json()
    except Exception as exc:  # noqa: BLE001
        log.exception("email: send failed for %s (%s)", to, exc)
        return None


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


def _wrap(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    """
    Minimal dark-mode-safe template. Keeps things inline-styled because most
    email clients don't support <style> or classes.
    """
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <tr><td style="padding: 8px 0 24px;">
          <a href="{cta_url}"
             style="display:inline-block; padding:10px 18px; background:#c9a96e;
                    color:#07070d; font-weight:600; font-size:14px;
                    text-decoration:none; border-radius:6px;">
            {cta_label}
          </a>
        </td></tr>
        """

    return f"""<!doctype html>
<html>
<head><meta charset="utf-8"><title>{title}</title></head>
<body style="margin:0; padding:0; background:#070B14; font-family:-apple-system,
             'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color:#F1F5F9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
         style="background:#070B14; padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0"
             style="max-width:560px; width:100%; background:#0F172A;
                    border:1px solid rgba(255,255,255,0.08); border-radius:10px;">
        <tr><td style="padding: 28px 28px 0;">
          <div style="font-size:14px; color:#c9a96e; font-weight:600;
                      letter-spacing:0.04em;">
            DevAstro<span style="color:#F1F5F9;">AI</span>
          </div>
        </td></tr>
        <tr><td style="padding: 20px 28px 0;">
          <h1 style="margin:0; font-size:22px; font-weight:600;
                     color:#F1F5F9; letter-spacing:-0.01em;">
            {title}
          </h1>
        </td></tr>
        <tr><td style="padding: 16px 28px 0; font-size:14px; line-height:1.6;
                       color:#94A3B8;">
          {body_html}
        </td></tr>
        <tr><td style="padding: 24px 28px 0;">
          <table role="presentation"><tr><td>
            {cta_block}
          </td></tr></table>
        </td></tr>
        <tr><td style="padding: 24px 28px 28px; border-top:1px solid rgba(255,255,255,0.06);
                       font-size:11px; color:#64748B;">
          Sent by DevAstroAI · <a href="{_app_url()}/app"
          style="color:#c9a96e; text-decoration:none;">Open app</a>
          · <a href="{_app_url()}/pro/settings"
          style="color:#c9a96e; text-decoration:none;">Email settings</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_welcome(*, to: str, name: str, role: str) -> None:
    """Sent after a user signs up. Supabase sends the confirmation link
    separately — this is the 'here's what you can do' follow-up."""
    first = (name or "there").split()[0]
    if role == "astrologer":
        body = f"""
          <p>Namaste {first},</p>
          <p>Welcome to DevAstroAI — the modern cloud-based practice
             workspace for KP astrologers. Your free tier includes up to
             5 clients, chart computation, and 20 AI readings per month.</p>
          <p>To get started, add your first client or try a horary
             reading from the Tools menu.</p>
        """
        cta_label = "Open your workspace"
        cta_url = f"{_app_url()}/pro"
    else:
        body = f"""
          <p>Namaste {first},</p>
          <p>Welcome to DevAstroAI. Your chart is ready to be computed —
             just add your birth date, time and place and we'll decode
             your destiny with KP precision.</p>
        """
        cta_label = "Create my kundli"
        cta_url = f"{_app_url()}/app"

    await _send(
        to=to,
        subject="Welcome to DevAstroAI",
        html=_wrap("Welcome to DevAstroAI", body, cta_label, cta_url),
        tag="welcome",
    )


async def send_session_summary(
    *,
    to: str,
    astrologer_name: str,
    client_name: str,
    summary_md: str,
    session_id: str,
) -> None:
    """Sent after a session is ended and summarized."""
    first = (astrologer_name or "there").split()[0]
    # Render markdown as very basic HTML (linebreaks + paragraphs).
    # Full markdown rendering would pull in another dep; the KP summary
    # is short and mostly plain text.
    html_summary = "".join(
        f"<p style='margin:0 0 10px;'>{line}</p>"
        for line in summary_md.split("\n\n")
        if line.strip()
    )
    body = f"""
      <p>Hi {first},</p>
      <p>Your session with <strong style="color:#F1F5F9;">{client_name}</strong>
         has been summarized. Claude drafted the following based on your
         notes and their chart context:</p>
      <div style="margin: 14px 0; padding: 14px 16px; background:#070B14;
                  border:1px solid rgba(255,255,255,0.06); border-radius:8px;
                  color:#F1F5F9; font-size:14px;">
        {html_summary}
      </div>
      <p>Review and edit inside the workspace — the client-facing version
         only ships once you approve it.</p>
    """
    await _send(
        to=to,
        subject=f"Session summary: {client_name}",
        html=_wrap(
            f"Session summary — {client_name}",
            body,
            "Review in workspace",
            f"{_app_url()}/pro/sessions/{session_id}",
        ),
        tag="session_summary",
    )


async def send_followup_reminder(
    *,
    to: str,
    astrologer_name: str,
    client_name: str,
    note: str,
    due_date: str,
    client_id: str,
) -> None:
    """Sent when a follow-up becomes due (scheduled job)."""
    first = (astrologer_name or "there").split()[0]
    body = f"""
      <p>Hi {first},</p>
      <p>Follow-up due today for
         <strong style="color:#F1F5F9;">{client_name}</strong>:</p>
      <div style="margin: 14px 0; padding: 14px 16px; background:#070B14;
                  border:1px solid rgba(201,169,110,0.25); border-radius:8px;
                  color:#F1F5F9; font-size:14px;">
        {note}
      </div>
      <p style="color:#64748B; font-size:12px;">Due {due_date}</p>
    """
    await _send(
        to=to,
        subject=f"Follow-up due: {client_name}",
        html=_wrap(
            f"Follow-up due — {client_name}",
            body,
            "Open client",
            f"{_app_url()}/pro/clients/{client_id}?tab=followups",
        ),
        tag="followup_reminder",
    )
