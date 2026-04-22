# Drag-to-Zone Navigation (Orb Gesture)

- **Conceived**: 2026-04-22
- **Inventor**: Manyue Javvadi (founder, DevAstroAI)
- **Status**: idea captured, not yet implemented
- **Planned PR**: A2.1 (or earliest available slot after Track A.1 Panchang audit ships)

---

## The idea in one line

Replace the tap-then-pick flow of the mobile navigation orb with a
**continuous drag gesture**: drag the orb to a specific zone on the
screen and release → navigate to the tab associated with that zone.
No intermediate sheet, no picker, no second tap.

## The current flow (what we have as of 2026-04-22)

Since PR A1.1c, the mobile app has a draggable floating Saturn orb
(inspired by iOS AssistiveTouch / Samsung Edge Panel). User flow today:

1. Tap the orb → bottom sheet opens with tab chips
2. Tap the desired tab chip → navigate, sheet closes

Two taps + a visual interruption between them.

## The new flow

1. Press and hold the orb (≥ ~180ms) → 4-8 translucent zone overlays
   fade in on screen, each labeled with a destination (Dashboard,
   Clients, Chart, Houses, Panchangam, Muhurtha, Match, Horary, etc.)
2. While still holding, drag across the screen → the zone under the
   pointer highlights
3. Release over a zone → navigate to that tab
4. Release outside any zone → normal drag-to-reposition (existing
   behavior, unchanged)
5. A short tap (< 180ms) still opens the bottom sheet like today

One gesture, one release, done.

## Why it's differentiated

Against everything I can find on the market as of 2026-04-22:

- **iOS AssistiveTouch** — draggable but only repositions; tap still
  required to navigate.
- **Samsung Edge Panel** — shows fixed app tiles in a stationary panel,
  no free-drag-to-target.
- **Radial hotkey dials in games** — ring-around-pointer UI, not
  free-drag-to-screen-zones.
- **macOS "workspaces" / hot corners** — desktop only, mouse-driven,
  zones aren't contextual to a draggable control.

What's novel in the combination:

1. Always-visible floating control that can be positioned anywhere
2. Zones materialize **only during drag**, so idle UI stays clean
3. Zones are **spatially meaningful** — an astrologer's muscle memory
   learns "top-right = Dashboard, bottom-left = Panchangam"
4. Tap-to-sheet remains for discoverability; drag-to-zone is the
   power-user shortcut

For a mobile app with a deep tab hierarchy (which every professional
astrology app ends up with), the gesture compresses 2 taps + a
cognitive switch into a single continuous motion.

## Spatial-zone layout proposal

Preliminary — to be refined during implementation. 8 zones for the
8 tabs currently on DevAstroAI:

```
┌─────────────────┬────────────────┐
│                 │                │
│   HOUSES        │  DASHBOARD /   │
│   (top-left)    │   CLIENTS      │
│                 │   (top-right)  │
│                 │                │
├─────────────────┼────────────────┤
│                 │                │
│   PANCHANGAM    │   CHART        │
│   (mid-left)    │   (mid-right)  │
│                 │                │
│                 │                │
├─────────────────┼────────────────┤
│                 │                │
│   MUHURTHA      │   HORARY       │
│   (bot-left)    │   (bot-right)  │
│                 │                │
└─────────────────┴────────────────┘
```

## Technical sketch

- Extends the existing `.command-orb` component
- `pointerdown` → start a 180ms timer + capture origin
- If pointer is still down after 180ms → emit `drag-nav` intent:
  fade in `<ZoneOverlay />` fullscreen, pointer-events on orb only
- `pointermove` → hit-test pointer against the 8 zones; highlight
  the one under the pointer; light haptic (`navigator.vibrate(8)`)
  when crossing into a new zone
- `pointerup` over a zone → `onTabChange(zone.tabId)` + haptic
  confirmation + fade out overlay + orb springs back to its pinned
  edge-tucked position
- `pointerup` outside any zone → existing edge-snap-to-nearest
  behavior (no tab change)
- Short tap (< 180ms) → existing bottom-sheet flow

Estimated scope: ~120 lines TSX + ~80 lines CSS. Behavior is purely
additive — existing orb + sheet untouched.

## Accessibility

- Screen readers: fallback to tap-to-sheet; the drag gesture is an
  enhancement not a replacement.
- Coach mark on first visit: a 1-shot overlay explaining the gesture
  with animated demo (similar to the existing orb coach mark).
- Zones labeled with both icon + text so visual memory works for
  visitors who never learn the spatial positions.

## IP / Trademark notes

Per internal discussion 2026-04-22 with Claude Code during Track A.1:

- The **idea itself** (drag-and-release to a zone for navigation)
  is likely not patentable given AssistiveTouch + drag-and-drop
  prior art combinations.
- The **specific visual implementation + animation + zone layout**
  could be filed as a design patent, but cost-benefit is poor for
  a pre-revenue indie project.
- **Public disclosure** (this file, the eventual blog post, and
  the shipped code commit dated 2026-04-22) establishes dated
  prior art attributable to the inventor, which prevents a third
  party from patenting the same gesture over us.
- **Revisit with an IP lawyer at the incorporation / revenue
  milestone**, not before.

## Defence strategy while the feature is public

1. This file, dated 2026-04-22, authored by Manyue Javvadi.
2. Implementation PR commit will carry the same date in git history.
3. On first public user-facing mention (landing page, app-store
   description, blog post), attribute the UX innovation explicitly:
   *"Drag-to-zone navigation — a DevAstroAI UX invention."*
4. Don't rely on this alone; the real moat is execution velocity.

## What happens if someone else ships this first

Keep shipping. Execution quality + feature density + brand consistency
beats any isolated UX trick. The orb-with-drag-to-zone is one of many
differentiators, not the whole product.

---

*Captured in the heat of the moment on 2026-04-22 while the founder
was (in his words) "on top of the moon" about the idea. Good instincts
get protected by getting written down.*
