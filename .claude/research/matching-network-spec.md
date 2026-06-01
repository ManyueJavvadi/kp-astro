# Cross-Astrologer Matching Network — Phase M Spec

**Status:** Approved-in-concept on 2026-05-28.
**Target ship:** v1.5 — November 2026 (~8 weeks post Sept 9 launch).
**Public launch:** v2.0 — Q1 2027.
**Effort estimate:** ~2.5 weeks for v1 build.
**Pre-launch prep starts:** Week 1 of launch tracker (add
`matching_opt_in` column to the DB schema we're building anyway).

---

## The idea in two sentences

When an astrologer's client is looking for a marriage match, our
deterministic KP engine can scan all opt-in clients across the entire
network and identify high-compatibility matches — across the
boundaries of any single astrologer's roster. **No client data ever
crosses astrologer boundaries; we only connect the two astrologers
themselves**, and they then decide what to share with each other
professionally.

---

## Why this is potentially the biggest feature in the roadmap

1. **Solves a real problem no one else solves.** Shaadi.com /
   Jeevansathi / BharatMatrimony all have scam profiles, fake
   horoscopes, caste-only filters. Ours is **astrologer-verified
   humans + KP-doctrinal matching**. Genuinely a new market category.

2. **Builds a flywheel.** More astrologers → bigger client pool →
   better matches → more value per astrologer → more astrologers
   join. Classic network effect.

3. **Astrologer-to-astrologer business relationship IS the moat.**
   Even if a competitor copies the algorithm, they don't have your
   trusted astrologer relationships. You're the trust layer.

4. **Optional monetization at scale.** Match introductions can be
   free (network benefit) OR a small per-successful-introduction fee
   shared between the two astrologers + platform cut.

---

## Key privacy design (this is the brilliant part — credit to user)

**Original design (rejected):** show anonymized client cards
("23F Hyderabad BONDED") to the searching astrologer. Problem:
re-identifiable in small communities — re-identifies someone's
daughter to their husband.

**Refined design (adopted):** NEVER show any client data to anyone
outside that client's own astrologer.

- Astrologer X searches → system finds matches → **only tells X
  that matches were found, not who or where**.
- System notifies Astrologer Y (whose client is the match) → Y sees
  ONLY their own client's name (data Y already owns) + the fact
  that another verified astrologer searched.
- The two astrologers connect over chat → they share their clients'
  details with each other AS PROFESSIONALS at their own discretion,
  outside our system.
- We never become a data-handling middleman for client PII. We're
  pure introduction infrastructure.

This eliminates:
- Anonymization complexity (no need — we display nothing)
- Multi-state Indian privacy law concerns (no PII flows through)
- Re-identification risk
- Most of the legal exposure

---

## User journey

### Astrologer X (searcher)

1. Inside their client HARINI's record, clicks "Search KP marriage
   matches in network."
2. System runs (silently, no UI):
   - Filter all opt-in clients in network by: opposite gender + age
     window (-4/+1 years of HARINI's age) + (optional cultural
     filters astrologer sets)
   - Run KP compatibility against each candidate (uses existing
     compatibility_engine.py)
   - Identify top N matches above BONDED threshold
   - Look up which astrologer(s) own those matches → produce list
     of astrologer IDs (not client IDs)
3. Astrologer X sees:
   ```
   Search complete.
   Found 2 strong KP-compatibility matches in our network.
   We've notified the 2 astrologers whose clients matched.
   They may reach out to you.
   
   [View pending introduction requests →]
   ```
   Nothing else. No names, no client data, no astrologer Y identity.

### Astrologer Y (matched-with)

Notification arrives via email + in-app:
```
A verified astrologer (47 clients · 8 years on DevAstroAI) ran a
marriage-match scan, and ONE OF YOUR CLIENTS has a strong KP
compatibility verdict (BONDED · H7 sub-lord match).

Your client VINEETHA matched.   [View her chart →]

Would you like to discuss a possible match with the requesting
astrologer?

[Accept · Open chat]   [Decline]   [Snooze 7 days]
```

Astrologer Y sees their own client's name (their own data — fine to
display). Y does NOT see Astrologer X's identity, their client's
identity, or any details until Y accepts.

### After both accept

1-on-1 persistent chat opens between Astrologer X and Astrologer Y.

```
[Today, 4:12pm]

X: Hi, I have Harini — 25, software engineer, Hyderabad,
   Brahmin family open to non-Brahmin if temperament matches.
   Parents particularly want someone settled professionally.

Y: I have Vineetha — 23, M.Tech from BITS, working at Infosys
   Bangalore, parents in Vijayawada. Open to relocation.

X: Sounds promising. Let me share the H7 chain analysis...
   [paste]

Y: Yes, that matches my reading. Saturn dasha for both is
   stable through 2028. Should we set up a video call between
   the families?
```

We don't see the chat content; it's between the two astrologers.

### Family-level

Both astrologers go back to their respective client families:
- "I found a possible match through my professional network — would
  you like me to share details?"
- Same on both sides.
- Families exchange contact, decide whether to meet, take it from
  there. **We're completely out of this loop.**

---

## Algorithm sketch

```python
def search_matches(client_id):
    boy = get_client(client_id)
    
    # Step 1 — fast filtered query
    candidates = db.query("""
      SELECT c.*, a.id AS astrologer_id
      FROM clients c JOIN astrologers a ON c.astrologer_id = a.id
      WHERE c.gender != %s
        AND c.matching_opt_in = true
        AND c.birth_year BETWEEN %s AND %s
        AND c.astrologer_id != %s            -- not from same astrologer
    """, [boy.gender, boy.birth_year - 4, boy.birth_year + 1, boy.astrologer_id])
    
    # Step 2 — optional cultural filter (astrologer's choice)
    if boy.preferences.same_state:
        candidates = [c for c in candidates if c.state == boy.state]
    
    # Step 3 — KP compatibility (slow part, but bounded)
    # ~50 ms per match × maybe 100-200 candidates max = 5-10 sec
    scored = []
    for cand in candidates:
        score = compatibility_engine.compute(boy.chart, cand.chart)
        if score.verdict in ('BONDED', 'FRIENDLY'):
            scored.append((cand, score))
    
    # Step 4 — rank, take top N
    scored.sort(key=lambda x: x[1].numeric_score, reverse=True)
    top = scored[:5]
    
    # Step 5 — return astrologer IDs only, NO client data
    return [
        {
            'astrologer_id': cand.astrologer_id,
            'verdict': score.verdict,
            'top_factors': score.top_3_kp_factors,  # for the notification text
            'their_client_id': cand.id,  # for notifying THEIR astrologer, not displayed to X
        }
        for cand, score in top
    ]
```

**Optimization:** pre-compute matches in a nightly batch job rather
than on-demand. Compatibility scores rarely change (only when birth
data is edited). Cache results, refresh weekly.

---

## Required infrastructure (what we need to build)

| Piece | Effort | Notes |
|---|---|---|
| `matching_opt_in` DB column on clients | 5 min | **Added during Sept 9 launch prep**, free |
| Match scan endpoint + algorithm | 3 days | Reuses existing compatibility_engine.py |
| Astrologer-to-astrologer chat (threaded, persistent) | 1 wk | New build; needed for Phase M and possibly future astrologer community |
| Notification system (push / email / in-app) | 3 days | We need this anyway for client portal consult-back |
| Astrologer profile pages (verified, years, # clients) | 2 days | Trust signal in match notifications |
| "Search matches" UI in client detail page | 2 days | Single button + result modal |
| Audit log (every search, every notification, every chat) | 2 days | For dispute resolution + analytics |
| Client consent flow (opt-in checkbox + signature) | 2 days | Astrologer marks each client opt-in or not |

**Total: ~2.5 weeks of focused work for v1.**

---

## What client consent looks like

When an astrologer adds a new client (or edits one), they see:

```
[ ] Include this client in the DevAstroAI network's KP match-scanning pool

  How this works (one paragraph):
  - Other DevAstroAI astrologers can scan our network for KP
    compatibility matches for their own clients.
  - If your client matches with another astrologer's client, WE
    notify YOU (not your client, not the other astrologer's client).
  - You then decide whether to share your client's details with the
    other astrologer.
  - No personal data is ever shared by DevAstroAI; only KP charts
    are compared in the background.
  - Your client must consent to this in writing before you tick
    this box.
```

The astrologer asks their client verbally + gets written/signed
consent (paper or e-signature). It's the astrologer's professional
responsibility, exactly like sharing a referral note between doctors.

---

## Out of scope for v1.5

- Real-time chat (just persistent messaging; refresh works)
- Video calls between astrologers (Zoom-style integration)
- Automated match-outcome tracking ("did it lead to engagement?")
- Caste-specific algorithms (we provide neutral compatibility; cultural
  filters are astrologer's call to apply manually)
- Public-facing match feed (this stays strictly astrologer-to-astrologer)
- Direct client-to-client introduction (must always go through both
  astrologers as trust layer)

All deferred to v2.0 (Q1 2027) or later based on real usage signals.

---

## Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Astrologer X abuses the feature (mass-scans for matches without good intent) | Medium | Rate-limit scans per astrologer (5/day max v1). Audit log. Manual review if patterns abusive. |
| Two astrologers connect, one tries to scam the other | Low | Astrologer profile shows verification status + years on platform. Report-astrologer button. |
| Astrologer doesn't get client's consent and includes them anyway | Medium | Reminder text in UI; legal terms make astrologer liable; we are intermediary. |
| Match suggestion fails (engagement breaks off) → astrologer blames us | Low | Terms of service: we provide compatibility scoring only; outcome decisions are human. |
| Caste/community sensitivity in some communities | Medium | All cultural filters are astrologer-controlled and optional. No required caste field. |
| Algorithm performance at 10,000+ clients | Low | Pre-compute nightly batch; cache results; Neon can handle this easily |

---

## Roadmap relationship to Sept 9 launch

**Sept 9, 2026 launch:**
- Includes `matching_opt_in` column in DB (zero cost)
- Includes consent toggle in client portal pages (zero extra cost)
- Does NOT include matching algorithm, notifications, chat infrastructure

**v1.5 — November 2026** (~8 weeks post-launch):
- Astrologer-to-astrologer chat
- Astrologer profile pages
- Notification system
- Match-scan algorithm + UI
- Audit log
- Beta with your father + 5-10 close astrologer contacts

**v2.0 — Q1 2027:**
- Public launch of matching feature
- Refined match scoring (multi-factor: KP + age + city + opt-in caste if astrologer wants)
- Match success tracking (anonymized, opt-in: "did the introduction lead anywhere?")
- Marketing / PR moment ("the world's first KP-doctrinal astrologer network for arranged-marriage matching")

---

## Why this design is hard to copy

1. **Network effects** — competitors start at 0 astrologers. We start at our launch-day base.
2. **Astrologer trust relationships** — built one phone call at a time, can't be cloned.
3. **KP doctrinal rigor** — competitors using Vedic Ashtakoot (36-guna score) can't replicate the CSL chain verdict.
4. **Privacy-first design** — competitors who built on showing client profiles (Shaadi.com etc.) can't pivot to "we share nothing about clients" without rewriting their entire data model and breaking their existing UX.
5. **Cultural fit** — designed for Indian arranged-marriage context where astrologers are already the trust intermediaries.

---

## What pre-launch (Sept 9) MUST include for Phase M to be possible later

These are FREE TO ADD NOW and very expensive to retrofit later:

1. ✅ `matching_opt_in BOOLEAN DEFAULT FALSE` column on `clients` table
2. ✅ Consent toggle UI on client edit page (one checkbox + tooltip)
3. ✅ Audit log table (`audit_log` with actor + action + target — generic enough to use for many features)
4. ✅ Astrologer profile fields (verified, years_practicing, num_clients) added during P0 work
5. ✅ Notification system architecture (email + in-app) — needed for client portal anyway

**None of these add Sept 9 launch scope materially. They're 1-line schema additions + small UI checkboxes. But they unlock everything later.**
