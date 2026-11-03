# Design Document

## Overview

**Kiro — Cute Cat Petting Clicker** is a self-contained single-page application delivered as one `index.html` file. It uses no build tools, no frameworks, and no external JavaScript dependencies. The architecture is a flat, IIFE-wrapped Vanilla JS module that manages application state, DOM mutations, canvas rendering, and Web Audio synthesis directly.

The implementation is already complete. This design document describes the architecture as built, the component relationships, data models, and correctness properties that define expected behavior.

---

## Architecture

The application is structured as four logical layers inside a single HTML file:

```
index.html
├── <head>          — Google Fonts CDN, Tailwind CDN, all custom CSS
├── <body> (HTML)   — Semantic markup: canvas elements, main card, cat SVG, UI widgets
└── <script>        — Single IIFE containing all application logic
    ├── State        — petCount, soundOn, flags, timers
    ├── Reactions    — REACTIONS array with weighted entries and apply() closures
    ├── Milestones   — MILESTONES array with thresholds and metadata
    ├── Event Layer  — click, keydown, touchend handlers on #cat-stage
    ├── Render Layer — DOM mutation functions for counter, log, badges, progress bar
    ├── Particle Sys — #particle-canvas RAF loop for click-burst emoji particles
    └── BG Canvas    — #bg-canvas RAF loop for stars, clouds, glows, sparkles
```

All state is held in IIFE-local variables. There is no persistence layer (localStorage is not used).

---

## Components and Interfaces

### Cat SVG (`#cat-svg`)

An inline SVG (`viewBox="0 0 240 260"`) containing:

| Part | Element(s) | Notes |
|---|---|---|
| Tail | `<g id="cat-tail">` path | CSS `tailWag` keyframe, 2.6 s infinite |
| Body | `<ellipse>` + belly ellipse | `url(#gBody)` radial gradient |
| Ears | `<g id="ear-l/r">` polygons | CSS `ear-twitch-l/r` on demand |
| Head | `<ellipse>` | Rendered above body in paint order |
| Blush | `<ellipse id="blush-l/r">` | opacity toggled via `.show-blush` class |
| Eyes | Two pairs of `<ellipse>` (white + pupil) | SVG attrs mutated per reaction |
| Nose | `<polygon>` | Static |
| Mouth | `<path id="cat-mouth">` | `d` attr mutated per reaction |
| Whiskers | `<g id="whiskers">` lines | Static |
| Paws | `<ellipse>` + toe beans | Static |
| Floaters | `heart-el`, `zzz-el`, `angry-el`, `sweat-el`, `stars-el`, `sparkle-burst` | Toggled via CSS classes |

Reaction state is applied exclusively through:
1. Mutating SVG attributes (eye/mouth shape)
2. Adding/removing CSS state classes on `#cat-svg`

### Reaction Bubble (`#reaction-bubble`)

Absolutely positioned above the cat stage. A `.bubble-inner` div shows the reaction text. The `.visible` class drives a CSS scale + opacity transition. Auto-hides after 2.4 s via `setTimeout`.

### Pet Counter (`#pet-count`)

Gradient-clipped text element. Updated by setting `textContent`. A `.pop` CSS animation (scale 1→1.28→1, 0.28 s) is retriggered on each pet using the void reflow trick.

### Progress Bar (`#progress-fill`)

A `width` CSS property (percentage) drives the filled portion. The label `#progress-label` shows `current / nextMilestone` or `MAX`.

Formula:
```
pct = (petCount - prevMilestoneAt) / (nextMilestoneAt - prevMilestoneAt) * 100
```

### Milestone Badges (`#milestones-grid`)

Re-rendered on every pet via `renderMilestones()`. Each badge is a `<div>` that receives either `badge-locked` or `badge-unlocked` classes. The badge-unlocked class triggers a scale spring animation.

### Reaction Log (`#reaction-log`)

Entries are `prepend()`-ed as `<div class="log-entry">`. When `children.length > 8`, the last child is removed. A `logIn` CSS keyframe animates new entries in from the left.

### Milestone Toast (`#milestone-toast`)

Fixed-position bottom panel. `.show` class translates it into view via CSS transition. Auto-hidden after 3.8 s.

### Particle Canvas (`#particle-canvas`)

Fixed full-viewport `<canvas>`. Each pet spawns 13–35 emoji particles. Each particle has `{x, y, vx, vy, alpha, size, glyph, decay, gravity}`. The RAF loop clears and repaints every frame, splicing dead particles (alpha ≤ 0).

### Background Canvas (`#bg-canvas`)

Fixed full-viewport `<canvas>`. Initialized with 4 element types — `glow`, `star`, `cloud`, `sparkle` — each with autonomous drift/float parameters. Re-initialized on resize.

### Sound Engine

Pure Web Audio API synthesis. `AudioContext` is created lazily on first user gesture. The `tone(type, freq, dur, vol, detune, delayMs)` helper creates an Oscillator → GainNode chain with an exponential ramp to near-zero. Per-reaction patterns call `tone()` multiple times with varying delays to produce chords and arpeggios.

---

## Data Models

### Reaction Object

```js
{
  id:     string,         // kebab-case identifier
  name:   string,         // Display name
  emoji:  string,         // Single emoji
  bubble: string,         // Kaomoji + text shown in reaction bubble
  color:  string,         // Hex color for bubble border and log entry
  weight: number,         // Relative probability weight (higher = more frequent)
  apply:  function()      // Mutates SVG attrs and adds CSS classes; no return value
}
```

Weights and IDs:

| ID | Weight |
|---|---|
| happy | 22 |
| purring | 18 |
| blushing | 16 |
| playful | 16 |
| zoomies | 14 |
| surprised | 12 |
| sleepy | 8 |
| grumpy | 5 |

### Milestone Object

```js
{
  at:    number,   // Pet count threshold
  emoji: string,
  title: string,
  desc:  string,
  color: string
}
```

Thresholds: 10, 25, 50, 100.

### Particle Object

```js
{
  x, y:     number,   // Current canvas position
  vx, vy:   number,   // Velocity per frame
  alpha:    number,   // 0–1 opacity
  size:     number,   // Font size in px
  glyph:    string,   // Emoji character
  decay:    number,   // Alpha reduction per frame
  gravity:  number    // vy acceleration per frame
}
```

### Background Element Object

Union of four shapes — `glow`, `star`, `cloud`, `sparkle` — each carrying position, animation phase, speed, and directional drift.

---

### Event Interface

| Event | Target | Handler |
|---|---|---|
| `click` | `#cat-stage` | `onPet(e)` |
| `keydown` (Enter/Space) | `#cat-stage` | `onPet({clientX:null, clientY:null})` |
| `touchend` (passive:false) | `#cat-stage` | `onPet({clientX, clientY})` |
| `click` | `#sound-btn` | Toggle `soundOn`, update icon |
| `resize` | `window` | Resize both canvases + re-init bg elements |

### `onPet(e)` Flow

```
1. petCount++
2. reaction = pickReaction()           // weighted random
3. reaction.apply()                    // mutate SVG + add CSS classes
4. playReactionSound(reaction.id)      // Web Audio, no-op if soundOn=false
5. Update #pet-count + .pop animation
6. Update #reaction-name label
7. showBubble(reaction)
8. spawnParticles(px, py, 13)
9. spawnPawStamp(ex, ey)
10. addLogEntry(reaction)
11. updateProgress()
12. Check milestones → showToast / playMilestoneSound / spawnParticles(35)
13. renderMilestones()
```

### `resetFace()` Contract

Called at the start of every `reaction.apply()`. Restores all SVG eye/mouth/blush attributes to default values and removes all state CSS classes from `#cat-svg`.

---

## Error Handling

- **AudioContext suspended**: `ensureAudio()` calls `audioCtx.resume()` before creating oscillators.
- **AudioContext unavailable**: The `window.AudioContext || window.webkitAudioContext` fallback covers older browsers; if neither exists the app silently skips sound.
- **Touch events**: The `touchend` handler calls `e.preventDefault()` to suppress the synthetic click that would otherwise double-fire `onPet`.
- **Canvas resize**: Both canvases resize on `window.resize`. The BG canvas also re-initializes its element array to maintain correct density.
- **Toast overlap**: `clearTimeout(toastTimer)` before each new toast prevents stale hide callbacks from hiding a newly triggered toast early.
- **Reaction bubble overlap**: `clearTimeout(bubbleTimer)` resets the auto-hide timer on rapid clicks.

---

## Testing Strategy

**Unit / example-based tests** cover specific behaviors with concrete inputs:
- Initial counter value (0 on load)
- Individual reaction SVG attribute mutations (one test per reaction)
- Milestone badge transition from locked to unlocked at exact thresholds
- Toast visibility on milestone trigger
- Sound toggle state and icon update
- Reaction log placeholder presence on fresh load
- Log entry animation class presence

**Property-based tests** cover universal invariants across many generated inputs:
- Pet counter monotonic increment (any N → N+1)
- Reaction bubble populated correctly for all 8 reactions
- Particle count growth after every pet
- Weighted reaction coverage over large samples
- Reaction state reset / no CSS class leakage between reactions
- Progress bar formula correctness for all valid count values
- Milestone unlock persistence once triggered
- Reaction log bounded at ≤ 8 entries for any number of pets
- Reaction log LIFO ordering
- Sound toggle idempotence (double-toggle returns to original state)

Background canvas rendering and sound synthesis are not covered by automated tests because they depend on `requestAnimationFrame` and the Web Audio API, which require browser environment stubs. Integration-style smoke tests (opening the page and asserting the canvas is present and non-zero size) are sufficient for those layers.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Pet Counter Monotonic Increment

*For any* initial pet count N, triggering one pet interaction shall produce a displayed counter value of exactly N + 1.

**Validates: Requirements 1.1, 3.2**

---

### Property 2: Reaction Bubble Population

*For any* of the 8 possible reactions, when that reaction is applied the reaction bubble text shall equal that reaction's `bubble` string and the bubble element shall have the `visible` class.

**Validates: Requirements 1.3, 2.10**

---

### Property 3: Particle Count Growth

*For any* pet interaction, the number of active particles after the interaction shall be strictly greater than the number before the interaction.

**Validates: Requirements 1.4**

---

### Property 4: Weighted Reaction Coverage

*For any* sufficiently large sample of weighted-random reaction selections (≥ 500 picks), all 8 reaction IDs shall appear at least once, and higher-weight reactions shall appear more frequently than lower-weight reactions.

**Validates: Requirements 2.1**

---

### Property 5: Reaction State Reset Before Apply

*For any* two consecutive reactions R1 followed by R2, after R2 is applied the `#cat-svg` element shall not carry any CSS state classes belonging exclusively to R1.

**Validates: Requirements 2.11**

---

### Property 6: Reaction Label Binding

*For any* reaction R selected during a pet interaction, the `#reaction-name` element's text content shall contain R's emoji and R's name.

**Validates: Requirements 2.10**

---

### Property 7: Progress Bar Formula Correctness

*For any* pet count C with a defined next milestone at threshold T and previous milestone at P, the progress bar width percentage shall equal `(C - P) / (T - P) * 100`, clamped to [0, 100].

**Validates: Requirements 3.3**

---

### Property 8: Milestone Unlock Threshold

*For any* milestone with threshold T, after the first pet interaction that brings the total count to exactly T the corresponding badge element shall carry the `badge-unlocked` class, and it shall continue to carry that class for all subsequent pet counts greater than T.

**Validates: Requirements 3.4, 3.5, 3.6, 3.7**

---

### Property 9: Reaction Log Bounded Size

*For any* sequence of pet interactions, the number of child elements inside `#reaction-log` shall never exceed 8.

**Validates: Requirements 4.2**

---

### Property 10: Reaction Log LIFO Order

*For any* two consecutive pet interactions producing reactions R_n and R_{n+1}, after both interactions the first child of `#reaction-log` shall represent R_{n+1} and the second child shall represent R_n.

**Validates: Requirements 4.1**

---

### Property 11: Sound Toggle Idempotence

*For any* initial sound state S (on or off), toggling the sound button twice shall return the sound state to S.

**Validates: Requirements 5.2**
