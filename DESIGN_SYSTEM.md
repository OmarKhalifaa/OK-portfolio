# Design Language System — Omar Khalifa Portfolio

This document is the source of truth for the portfolio’s visual language, layout, components, and motion behaviour.

## Principles

- Calm editorial structure with visible grid logic.
- Light-first presentation with a fully supported dark theme.
- Green is an interaction accent, not a surface colour.
- Motion should feel deliberate, physical, and continuous.
- Information density comes from alignment and hierarchy rather than decoration.

## Foundations

### Typography

| Role | Family | Weight | Current use |
|---|---|---:|---|
| Display | Syne | 500–800 | Hero, section titles, card titles, logo, counters |
| Body and UI | DM Sans | 300–500 | Navigation, body copy, metadata, tags, timeline |

Key concept sizes:

| Element | Specification |
|---|---|
| Hero greeting | `clamp(54px, 5vw, 92px)`, `0.92` line-height, `-0.065em` tracking |
| “I’m Omar!” line | `0.78em` of the greeting, no wrap, `0.1em` top separation |
| Middle statement | Responsive display size defined by `.concept-statement` |
| Section titles | `18px` Syne 600 via `--concept-section-title` |
| Card titles | `clamp(17px, 1.35vw, 22px)` |
| Stat counters | `42px` Syne, one-line odometer slots |

### Colour tokens

Dark mode is the default document theme. Light mode remains available through the theme toggle.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--bg` | `#F5F3EC` | `#0C0C0B` | Page and column background |
| `--bg-2` | `#EFEDE5` | `#111110` | Secondary surfaces |
| `--bg-3` | `#E5E2D8` | `#181817` | Hover/elevated surfaces |
| `--border` | `rgba(10,10,8,.09)` | `rgba(255,255,255,.07)` | Grid and card separators |
| `--border-2` | `rgba(10,10,8,.18)` | `rgba(255,255,255,.12)` | Strong controls and outlines |
| `--text-1` | `#111110` | `#F5F4EE` | Primary text |
| `--text-2` | `#4A4A46` | `#B8B8B1` | Body copy |
| `--text-3` | `#7A7A73` | `#7A7A73` | Metadata and muted labels |
| `--accent` | `#1F8F6A` | `#5DCAA5` | Trail, glints, rain, active details |
| `--nav-bg` | `rgba(245,243,236,.85)` | `rgba(12,12,11,.85)` | Translucent full-width navigation |
| `--surface-soft` | `rgba(10,10,8,.035)` | `rgba(255,255,255,.04)` | Stat and logo tiles |

### Texture and visibility

- A fixed fractal-noise overlay adds subtle material texture.
- The left column uses an `18px × 18px` dot field with a bottom fade mask.
- Twelve green glints are placed randomly on load and pulse independently.
- Browser scrollbars are visually hidden while scrolling remains enabled.

## Layout

### Project case studies

Project pages use a three-column editorial shell on desktop:

| Column | Width | Behaviour |
|---|---:|---|
| Section navigation | `238px` | Sticky table of contents with active-section tracking |
| Case study | Flexible | Hero, fixed four-field metadata strip, and CMS-ready content blocks |
| Next projects | `286px` | Sticky recommendation rail with three project cards |

At `960px` the recommendation rail moves below the case study. At `720px` the section navigation becomes a sticky horizontal strip and all content follows a single-column flow. The project metadata remains fixed in structure while the content blocks are intended to become reorderable through Decap CMS.

Project content is stored as JSON in `content/projects`. `project.html` renders each block at runtime, builds the side navigation from block labels, and resolves the three recommended-project cards. Decap CMS is available at `/admin/`; its schema and allowed block types live in `admin/config.yml`.

The project-page header reuses the homepage navigation geometry, typography, link structure, theme control, and mobile `+` menu. Image blocks expose controlled width, alignment, aspect-ratio, fit, focal-point, and caption settings; text-image blocks also expose column proportion and vertical alignment.

### Desktop

The main shell is a full-height three-column grid:

| Column | Share | Behaviour |
|---|---:|---|
| Introduction | 26% | Sticky, viewport-height profile/greeting column |
| Selected work | 48% | Scrolling editorial work column |
| Experience | 26% | Sticky, viewport-height timeline and metrics column |

Vertical borders are structural grid lines. The middle card stack uses a two-column, two-row grid with hard separators and no rounded outer card containers.

### Responsive

| Breakpoint | Behaviour |
|---|---|
| `≤1180px` | Two-column hero/work shell; Experience moves below as a full-width section |
| `≤820px` | Single document flow; work cards stack; sticky columns become normal sections |
| `≤620px` | Single-row mobile header with an expanding `+` dropdown sheet, compact profile padding, and simplified card metadata |
| `(hover: none)` | Custom cursor, trail, and halo effects are disabled |

## Components

### Primary navigation

- Fixed, full-width bar with a flat bottom rule and subtle `12px` backdrop blur.
- Bold uppercase “OMAR KHALIFA” wordmark begins at the middle-column grid line.
- “About | Profile” links and the theme control align to the right edge of that same middle column.
- The bar does not collapse or change shape while scrolling.
- On mobile, a `+` control reveals the links in a compact dropdown sheet below the wordmark; it rotates into a close icon while open.

### Introduction column

- Availability badge at the top.
- Two-line greeting: “Hey,” followed by the unbroken “I’m Omar!” line.
- Cairo location includes map, globe, and small CSS-rendered Egyptian-flag details.
- Social and resume links use dedicated icons and anchor the bottom-left; location sits opposite them.
- Dot field, fluid trail, and independent glints share the column without blocking input.

### Capability ribbon

- Horizontally looping pill strip in the middle column.
- Transparent background with top and bottom rules.
- Edge masks create soft entry and exit crops.
- Standard loop duration: `28s`.

### Selected-work cards

- Four cards shown as a `2 × 2` grid on desktop.
- Zero outer radius and no standalone surface; hierarchy comes from grid separators.
- Thumbnail ratio is `4 / 3`.
- Category pills are intentionally removed from thumbnail tops.
- Metadata tags remain below the project description.
- Cursor halo remains available on hover-capable devices.

### Experience and profile rail

- Experience and About content are blended into one module.
- Vodafone uses the official red mark asset.
- Freelance and Various Agencies use centred, bold `F` and `V` tiles.
- The About heading is omitted; copy follows the timeline after a separator.
- Metrics use large odometer counters with their labels directly below.

## Motion

| Pattern | Behaviour |
|---|---|
| Column entrance | Columns blend in left-to-right with blur removal; delays are `.03s`, `.2s`, `.38s` |
| Hero trail | Inertial green cursor trail with collision fragments; continues within the active hero session |
| Dot glints | Random positions, `3.5–7.5s` independent pulse cycles |
| Grid rain | Green light pulses travel down the three primary vertical separators every `4.6s` |
| Mobile line rain | Green pulses travel horizontally across the hero and work-heading dividers every `4.8s` |
| Odometer counters | Digits roll upward only, from zero to `7+` and `12+`, over `6.5s` |
| Capability ribbon | Continuous horizontal movement over `28s` |
| Navigation | Full-width flat header with stable geometry and `12px` backdrop blur |
| Theme switch | Incoming theme wipes upward from the viewport bottom over `.62s` using the View Transition API |

The counter reels are clipped to one digit height. For multi-digit values, each place rolls the number of turns required to arrive at the final value. The accessible value is supplied through `aria-label` while animated reel glyphs are hidden from assistive technology.

### Reduced motion

When `prefers-reduced-motion: reduce` is active:

- Grid rain and random glints are removed.
- Counter reels immediately show their final values.
- Theme changes apply immediately without the bottom-up wipe.
- Touch devices do not render the custom cursor or fluid trail.

## Asset palettes

| Work thumbnail | Palette |
|---|---|
| Master Design System Kit | Deep navy with violet icon |
| Login Revamp | Deep red with Vodafone red icon |
| Bikeopolis | Warm near-black with orange icon |
| Meal-Holic | Aubergine near-black with purple icon |

## Maintenance rules

### About page

- `about.html` reuses the homepage's `26 / 48 / 26` desktop column proportions.
- The left introduction and right profile rail stay viewport-height and sticky while the editorial story scrolls through the center column.
- The center column mixes an oversized personal statement, paired narrative copy, a bordered software-stack matrix, and a bold moving connection strip; the right rail focuses on the portrait and education.
- At `≤1180px`, the profile rail becomes a two-column full-width section. At `≤820px`, the full page becomes one continuous column.
- The dotted field, separator rain, typography, border treatment, theme behavior, and reduced-motion handling match the homepage system.

- Update this file whenever layout proportions, tokens, motion durations, breakpoints, or component behaviours change.
- Keep cache-busting query versions in `index.html` aligned for CSS and JavaScript.
- Preserve dark mode as the default unless the product direction explicitly changes.
- Every new continuous animation must include a reduced-motion treatment.
