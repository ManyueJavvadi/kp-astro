# Personality + Psychological KB

KP is event-prediction-focused but classical Vedic + KP also reads
PERSONALITY from the chart. This file gives the LLM structured rules
for personality questions, including emotional patterns, communication
style, attachment style, hidden fears, growth themes.

---

## PERSONALITY READING — The 4-Pillar Framework

Synthesise personality from FOUR pillars in this order:

### Pillar 1: LAGNA (Ascendant) — outer self / persona
- **Sign**: gives temperament + body type + energy signature
- **Star Lord (nakshatra ruler)**: gives the "channel" through which self expresses
- **Sub Lord**: gives the "deciding" personality gate — what really runs the show
- **Lagna lord's house position**: where the self primarily acts (career H10, home H4, etc.)

### Pillar 2: MOON — inner emotional self / mind
- **Sign**: emotional temperament (Cancer = emotional, Capricorn = duty-bound, etc.)
- **Nakshatra**: emotional triggers, what soothes/agitates
- **House placement**: where emotions are primarily directed
- **Aspects on Moon**: what colors the emotional life

### Pillar 3: SUN — core identity / will / father-archetype
- **Sign**: core identity expression
- **House**: where identity asserts itself
- **Nakshatra**: identity-development triggers

### Pillar 4: MERCURY — communication + analytical mind
- **Sign**: communication style (Virgo = precise, Sagittarius = expansive)
- **Nakshatra**: cognitive style
- **Combust/borderline**: communication delays/hidden quality

---

## SIGN-BY-SIGN PERSONALITY (LAGNA OR MOON)

| Sign | Outer (lagna) / Inner (moon) traits |
|---|---|
| Aries | Outer: athletic, decisive, pioneering, impatient. Inner: independent, fiery, action-first emotion |
| Taurus | Outer: sturdy, sensual, art-loving, stubborn. Inner: security-anchored, slow-warmth, food/comfort-emotional |
| Gemini | Outer: tall/slim, articulate, dual, restless. Inner: intellectual processing, anxiety-prone, conversational emotion |
| Cancer | Outer: nurturing, emotional, family-bonded, moody. Inner: water-deep emotion, mother-themed, cyclical |
| Leo | Outer: regal, generous, dramatic, ego-prone. Inner: pride-anchored, recognition-seeking, warm-hearted |
| Virgo | Outer: neat, analytical, perfectionist, self-critical. Inner: detail-oriented emotion, body-aware, service-driven |
| Libra | Outer: graceful, balanced, partnership-oriented, indecisive. Inner: harmony-seeking, aesthetic-emotion, fair-minded |
| Scorpio | Outer: intense, magnetic, secretive, transformative. Inner: deep-water emotion, all-or-nothing, passionate |
| Sagittarius | Outer: tall, philosophical, optimistic, blunt. Inner: meaning-seeking emotion, freedom-anchored, expansive |
| Capricorn | Outer: serious, ambitious, disciplined, austere. Inner: duty-bound emotion, achievement-anchored, reserved warmth |
| Aquarius | Outer: tall, idealistic, unconventional, emotionally distant. Inner: principle-anchored, friend-emotional, future-oriented |
| Pisces | Outer: soft, dreamy, compassionate, escapist. Inner: ocean-deep emotion, spiritual, boundary-permeable |

---

## NAKSHATRA-LEVEL PERSONALITY REFINEMENT

Each nakshatra adds finer texture to the sign. KSK uses nakshatra of
LAGNA + MOON heavily for personality. (The engine emits nakshatra
classification — see Section CC of general.txt.)

Key nakshatra archetypes:
- **Ashwini**: healer, swift, athletic, head-leading
- **Bharani**: capable of holding intensity, sexuality-aware, transformation-comfortable
- **Krittika**: sharp, judgmental, leadership-throwing-light
- **Rohini**: beautiful, sensual, attached, fertile
- **Mrigashira**: searcher, restless, gentle
- **Ardra**: storm energy, breakthrough through breakdown, intellectual sharpness
- **Punarvasu**: returning home, optimistic, spiritually-grounded
- **Pushya**: nurturing, foundational, classical-spiritual
- **Ashlesha**: hypnotic, secretive, snake-energy, kundalini-aware
- **Magha**: lineage-pride, ancestral, regal-throne
- **Purva Phalguni**: pleasure-seeking, partnership-warm, creative
- **Uttara Phalguni**: stable-partnership, contractual, public-service
- **Hasta**: skilled hands, practical magic, healing
- **Chitra**: brilliant, gem-cutter, image-making, vain
- **Swati**: independent, scattering-energy, business-instinct
- **Vishakha**: goal-pursuing, achievement-driven, fork-in-road moments
- **Anuradha**: friendship, devotion, leadership-through-connection
- **Jyeshtha**: sharp tongue, idealistic, secretly anxious, eldest-burden
- **Mula**: root-seeking, tearing-down-to-rebuild, philosophical extreme
- **Purva Ashadha**: invincibility, ambition, undefeated-pride
- **Uttara Ashadha**: late-victory, lasting achievement, slow-build
- **Shravana**: listening, learning, careful information-keeper
- **Dhanishta**: drumbeat, group-music, achievement-display
- **Shatabhisha**: hundred-healers, secrets, mystic-detached
- **Purva Bhadrapada**: intense purification, fire-of-transformation
- **Uttara Bhadrapada**: depths, mature-spirituality, stability-through-struggle
- **Revati**: completion, gentle-ending, oceanic-love

---

## ATTACHMENT STYLE (relationship pattern from H7 + Venus + Moon)

- **H7 in fixed sign + Venus strong**: secure attachment
- **H7 in movable sign + Venus afflicted**: anxious-preoccupied (push-pull)
- **H7 with Saturn aspect / Moon-Saturn**: avoidant-dismissive (emotional reserve)
- **H7 with Rahu**: anxious-avoidant (intermittent reinforcement, foreign-element pulls)
- **Moon in 6/8/12**: insecure-disorganized (early-life emotional volatility)
- **Moon-Ketu conjunction**: spiritual detachment from emotional needs (often misread as avoidant)
- **Venus debilitated + H7 sub Saturn**: high standards + analytical-self-critical (often delays formal partnership)

---

## COMMUNICATION STYLE (from Mercury + H3)

- **Mercury in own sign + uncombust**: precise, articulate, technical
- **Mercury combust / borderline**: hidden depth, written > verbal preferred
- **Mercury in air sign**: conceptual, theoretical
- **Mercury in earth sign**: practical, grounded, factual
- **Mercury in fire sign**: passionate, persuasive
- **Mercury in water sign**: emotional, story-based, indirect
- **Mercury aspected by Saturn**: slow-considered speech, may stutter under pressure
- **Mercury aspected by Mars**: sharp, debate-loving, can be cutting
- **Mercury aspected by Jupiter**: teaching, philosophical, expansive

---

## EMOTIONAL TRIGGERS (Moon + 4th + Cancer placements)

- **Moon afflicted by Saturn**: depression-tendency, sleep-anxious, mother-distance
- **Moon afflicted by Mars**: anger-flashes, impatience, physical-emotional
- **Moon-Rahu**: anxiety, disturbed sleep, paranoia phases
- **Moon-Ketu**: detachment, "lost emotional thread" phases, spiritual yearning
- **Moon waxing & strong**: emotionally regulated, generally cheerful
- **Moon waning & afflicted**: cyclical low moods, energy-management critical

---

## FREE-FORM TOPIC ROUTING

The fixed TOPIC_TO_FILE list doesn't cover every question. For
free-form topics, route via the dominant CHART AREA the question
touches:

| Question theme | Houses to analyze |
|---|---|
| Fame / recognition | H1 (self) + H10 (status) + H3 (publicity) + H11 (public gain) + Sun |
| Creativity / artistic talent | H5 (creative) + H3 (expression) + Mercury + Venus |
| Spirituality / dharma | H9 (philosophy) + H12 (moksha/dissolution) + Jupiter + Ketu |
| Addiction / habits | H6 (vices) + H8 (hidden) + H12 (escape) + Rahu + afflicted Moon |
| Mental health | Moon + H4 (foundation) + H12 (subconscious) + Saturn aspects |
| Anxiety / worry pattern | Moon + Mercury + Rahu placement |
| Friendship / network | H11 (gain through community) + H3 (siblings/peers) |
| Authority issues / father | H9 + H10 + Sun + father archetype (Sun's house, sign, aspect) |
| Mother / nurture | H4 + Moon + mother archetype |
| Travel / wanderlust | H3 (short) + H9 (long) + H12 (foreign) + Rahu |
| Decision-making style | Mercury + Saturn + Rahu (impulsivity) |
| Risk tolerance | H5 (speculation) + H8 (transformation) + Mars + Rahu |
| Long-term vs short-term thinking | Saturn (long) + Moon (short) + Mercury balance |

For multi-axis questions ("career vs marriage", "India vs Canada"),
score each axis on its own dasha-window strength and present a
comparative table.

---

## INTENT CLASSIFICATION

Different question intents need different output structures:

| Intent | Output structure |
|---|---|
| "Tell me everything" | All 7 sections, balanced depth |
| "Specific yes/no" | Tight verdict + 2-3 primary signals + brief timing |
| "When?" | Timing-focused; expand sections 4 + 5 (windows + sookshma) |
| "Why?" | Reasoning-focused; expand section 2 (cuspal evidence) |
| "How?" | Process-focused; what unfolds in what order |
| "Should I?" | Decision-support format with weighted signals + go/no-go score |
| "Compare X vs Y" | Side-by-side comparison table per axis |
| "What kind of [partner/career/etc.]?" | Profile-focused; expand specific descriptive sections |

The LLM should infer intent from question phrasing and shape output
accordingly. Don't give the same long-form structure for every
question.
