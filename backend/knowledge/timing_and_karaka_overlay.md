# Timing & Karaka Overlay — Universal KP Rules

**Cross-cutting KP rules applied to EVERY topic.** Loaded in every
astrologer-mode query as part of `ADVANCED_FILES`.

Source: K.S. Krishnamurti KP Readers + Vaastuinternational.com
Extracted PR A2.0d from `other_topics.txt` §7 + §8 + §11 (verbatim, no
doctrine change). Centralised here so all topic-specific KB files
(business.txt, wealth.txt, etc.) can reference them without duplicating.

---

## 1. GENERAL TIMING PRINCIPLES FOR ALL TOPICS

(was `other_topics.txt` §7)

### Moveable vs Fixed vs Common signs in timing

When the cusp sub lord is in:
- **Moveable sign** (Aries, Cancer, Libra, Capricorn): Event happens QUICKLY once timing opens
- **Fixed sign** (Taurus, Leo, Scorpio, Aquarius): LONG DURATION before event
- **Common/Dual sign** (Gemini, Virgo, Sagittarius, Pisces): UNDUE DELAY even when timing favorable

This is critical for "when will it happen" within a favorable AD:
- Native in moveable sign sub lord → First 1/3 of the AD
- Native in fixed sign sub lord → Middle or last 1/3 of the AD
- Native in common sign sub lord → Unpredictable timing within the AD

### 3rd House signification (boldness to act)

The H3 sub lord connected to H2 or H10 or H11 → native will have the
courage to actually undertake and complete the matter in that period.
**Without H3 activation, even a favorable period may pass without action.**

---

## 2. KARAKA OVERRIDE / CONTEXT-BOOST DOCTRINE

(was `other_topics.txt` §8)

### The Venus override for marriage

Even if H7 sub lord is weak, if Venus is:
- Lord of H7 AND H11 (or H7 AND H2)
- AND is the Lagna Star Lord (Ruling Planet)
- AND signifies the relevant houses

→ Venus creates a CONDITIONAL promise despite weak H7 sub lord.

### Jupiter as context-booster for children/wealth (NOT override)

(PR A1.9 — renamed from "JUPITER OVERRIDE" to align with RULE 12
"karakas are context, never override CSL".)

If Jupiter is:
- Lord of H2 or H5
- In star of planet in H5 or H11
- AND appears as Ruling Planet

→ Jupiter is a strong context-booster on top of an already-promising
H5 CSL chain. It does NOT rescue a Denied H5 verdict by itself.
Per RULE 12 (KARAKAS ARE CONTEXT, NEVER OVERRIDE CSL), the H5 CSL
signification is what determines promise. A strong Jupiter improves
QUALITY (e.g., easier childbirth, dharmic atmosphere, blessing-like
ease) of an already-promised child, but does NOT manufacture a child
in a chart whose H5 CSL signifies only the denial set {1, 4, 10, 12}
alone.

### Karaka strength rule (rephrased for canonical-KP fidelity)

When the natural significator (karaka) of a house is STRONG (well-placed,
in good star, appears in Ruling Planets) it adds CONTEXTUAL quality to
the verdict the CSL chain already gives. It does NOT flip a denial to a
promise. Conversely, a weak karaka adds delay/friction but does NOT
flip a clean CSL promise into a denial.

This is fully consistent with the Venus-context-not-override rule used
in marriage analysis (marriage.txt §4) and the system prompt's RULE 12.

### When karaka is weak (rephrased — friction signal, not verdict-flipper)

Even when the cusp sub lord is strong, an afflicted karaka adds FRICTION
or DELAY to the verdict the CSL gives — but does NOT cancel the CSL's
promise:
- **Marriage**: Venus afflicted → delays / friction in marital happiness
  even if H7 sub lord promises marriage
- **Children**: Jupiter afflicted → delays / medical-assistance route to
  childbirth even with good H5 sub lord
- **Career**: Mercury/Saturn afflicted → career obstacles / late
  recognition even with good H10 sub lord
- **Property**: Mars afflicted → property obstacles / disputes even with
  good H4 sub lord

In all cases the CSL chain is the deciding factor; karaka strength is
the quality modifier. Do NOT use karaka affliction to override a CSL
promise, and do NOT use karaka strength to manufacture a CSL denial
into a promise.

---

## 3. SPECIFIC-DATE QUESTION FRAMEWORK

(was `other_topics.txt` §11; PR A1.3-fix-19)

When user asks **"Will [event X] happen by [specific date Y]?"**:

1. Identify the topic and its relevant houses
2. Compute the dasha (MD/AD/PAD/Sookshma) at date Y
3. Check whether AD lord at date Y signifies the relevant houses AND not the denial houses
4. Check whether PAD lord at date Y aligns with significators
5. Check whether Sookshma fire-rank for that specific week is high
6. Cross-check with Ruling Planets at moment of ASKING the question
7. Verdict matrix:
   - AD aligned + PAD aligned + Sookshma high + RP overlap = **HIGH probability**
   - 3 of 4 align = MODERATE probability (likely with some delay)
   - 2 of 4 align = LOW probability (likely deferred)
   - 1 or 0 align = the date is unsupported by chart structure

### Output format

- **If aligned**: "Yes, the chart structure supports [event] around [date].
  Specifically: [evidence]."
- **If misaligned**: "Date Y does not strongly align. The structurally
  supported window is [actual window from analysis]. Reason: [specific dasha mismatch]."
- **If genuinely uncertain**: "KP cannot confidently answer this specific
  date. The closest favorable window is [X]."

### Caveat

Always note that human action / external administrative timing can shift
events within a window. KP gives **structural probability**, not calendar
certainty.
