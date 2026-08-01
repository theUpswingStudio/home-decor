---
name: Vestrel House
description: The Material Editor — an editorial, tactile, collected, and architectural system.
colors:
  oxidized-steel: "#8a3d2f"
  oxidized-steel-deep: "#6b2e24"
  patinated-olive: "#4f6047"
  plaster-canvas: "#f4f0e8"
  chalk-surface: "#fffdfa"
  graphite: "#1f211d"
  weathered-graphite: "#615e56"
  functional-stone: "#8f897d"
  plaster-rule: "#d4cec2"
  card-stone: "#d8d0c3"
  material-stage: "#e9e3d8"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.75rem, 6.5vw, 6.5rem)"
    fontWeight: 450
    lineHeight: 0.94
    letterSpacing: "-0.04em"
  hero-display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3.75rem, 6.15vw, 6rem)"
    fontWeight: 430
    lineHeight: 0.89
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.25rem, 4.5vw, 4rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.035em"
  editorial-headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.75rem, 5vw, 5.2rem)"
    fontWeight: 430
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-fluid:
    fontFamily: "Geist, sans-serif"
    fontSize: "clamp(0.95rem, 1.25vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.6
  action:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 650
    lineHeight: "1.25rem"
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.25
  compact-control:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: "1.25rem"
  metadata:
    fontFamily: "Geist, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
  wordmark:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.45rem"
    fontWeight: 550
    lineHeight: 1
    letterSpacing: "-0.045em"
  mobile-navigation:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 7vw, 3rem)"
    fontWeight: 450
    lineHeight: 1
    letterSpacing: "-0.035em"
  room-title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.35rem, 2vw, 2rem)"
    fontWeight: 480
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  material-lead:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.75rem, 2.6vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.15
  consultation-display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(3rem, 5.5vw, 6rem)"
    fontWeight: 430
    lineHeight: 0.96
    letterSpacing: "-0.04em"
rounded:
  sharp: "0"
  small: "2px"
  medium: "6px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
  space-16: "64px"
  space-20: "80px"
  space-24: "96px"
  space-32: "128px"
components:
  button-primary:
    backgroundColor: "{colors.oxidized-steel}"
    textColor: "{colors.chalk-surface}"
    typography: "{typography.action}"
    rounded: "{rounded.small}"
    padding: "12px 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.oxidized-steel-deep}"
    textColor: "{colors.chalk-surface}"
    typography: "{typography.action}"
    rounded: "{rounded.small}"
    padding: "12px 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.action}"
    rounded: "{rounded.small}"
    padding: "12px 24px"
    height: "48px"
  input-default:
    backgroundColor: "{colors.chalk-surface}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.small}"
    padding: "12px 16px"
    height: "52px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
    height: "40px"
  filter-chip-selected:
    backgroundColor: "{colors.patinated-olive}"
    textColor: "{colors.chalk-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "8px 12px"
    height: "40px"
  product-card:
    backgroundColor: "{colors.chalk-surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.small}"
---

# Design System: Vestrel House

## Overview

**Creative North Star: "The Material Editor"**

Vestrel House treats a room as an edited composition of proportion, patina, and daily use. The system feels editorial, tactile, collected, and architectural: warm mineral surfaces create quiet atmosphere, disciplined typography establishes authority, and material-toned accents appear with intent rather than decoration.

The interface balances lived-in warmth with plan-like precision. Large Newsreader headlines and image-led asymmetry carry the emotional weight; Geist labels, fine rules, compact controls, and explicit states keep the experience practical. It rejects playful ecommerce tropes and corporate SaaS styling in favor of a grounded catalog that feels considered without becoming precious.

**Key Characteristics:**

- Warm plaster and chalk surfaces anchored by graphite text
- Controlled oxidized-steel and patinated-olive accents
- Editorial serif scale paired with precise sans-serif utility text
- Asymmetric image compositions held inside disciplined grids
- Fine rules, nearly square corners, and restrained tactile controls
- Layered but grounded depth with shadows reserved for selected cards

## Colors

The palette has an architectural character: plaster, chalk, and graphite lead; oxidized steel and patinated olive behave like controlled material interventions.

### Primary

- **Oxidized Steel** (#8a3d2f): Primary action, selection, focus, and editorial accent. Its rarity gives calls to action and key transitions authority.
- **Deep Oxidized Steel** (#6b2e24): Hover, error, and higher-contrast companion to Oxidized Steel.

### Secondary

- **Patinated Olive** (#4f6047): Selected filters and quieter moments of material emphasis. It supports Oxidized Steel without competing with it.

### Neutral

- **Plaster Canvas** (#f4f0e8): Site canvas and dominant warm background.
- **Chalk Surface** (#fffdfa): Header, cards, controls, and raised content surfaces.
- **Graphite** (#1f211d): Primary text, dark sections, and decisive structural rules.
- **Weathered Graphite** (#615e56): Secondary copy and metadata.
- **Functional Stone** (#8f897d): Control borders and functional separators that must remain legible.
- **Plaster Rule** (#d4cec2): Decorative dividers and quiet section boundaries.
- **Card Stone** (#d8d0c3): Card outlines where a surface needs definition without a dark frame.
- **Material Stage** (#e9e3d8): Image placeholders and neutral media stages.

### Named Rules

**The Material Accent Rule.** Graphite, plaster, and chalk own the page; Oxidized Steel and Patinated Olive appear only where action, selection, or material emphasis earns them.

## Typography

**Display Font:** Newsreader (with Georgia and serif fallback)  
**Body Font:** Geist (with sans-serif fallback)

**Character:** Newsreader supplies literary warmth and high-contrast editorial scale; Geist keeps navigation, commerce details, form controls, and planning information exact. The pairing should feel like a material journal edited with architectural discipline.

### Hierarchy

- **Display** (450, `clamp(2.75rem, 6.5vw, 6.5rem)`, 0.94): Hero statements and rare page-defining moments; use tight negative tracking and balanced wrapping.
- **Hero Display** (430, `clamp(3.75rem, 6.15vw, 6rem)`, 0.89): The homepage's two-line opening composition. On short-height desktop viewports it steps down to `clamp(2.8rem, 5.2vw, 4.8rem)` so the complete hero remains visible.
- **Headline** (500, `clamp(2.25rem, 4.5vw, 4rem)`, 1): Section and editorial feature headings.
- **Editorial Headline** (430, `clamp(2.75rem, 5vw, 5.2rem)`, 0.96): Homepage room, product, material, and look openings where broader image-led scale is intentional.
- **Consultation Display** (430, `clamp(3rem, 5.5vw, 6rem)`, 0.96): The high-contrast planning invitation on the Oxidized Steel field.
- **Room Title** (480, `clamp(1.35rem, 2vw, 2rem)`, 1.05): Newsreader labels for room-led discovery cards.
- **Material Lead** (400, `clamp(1.75rem, 2.6vw, 2.75rem)`, 1.15): The long-form serif statement inside the material story.
- **Title** (620, 1rem, 1.35): Product, room, and component titles in Geist when scan speed matters.
- **Body** (400, 1rem, 1.6): Primary explanatory copy; keep important reading measures near 42–48rem.
- **Fluid Body** (400, `clamp(0.95rem, 1.25vw, 1.125rem)`, 1.6): Responsive hero and section support copy.
- **Action** (650, 0.9375rem, 1.25rem): Primary and secondary button labels.
- **Label** (650, 0.875rem, 1.25): Navigation, fields, and ordinary text links. Use sentence case by default.
- **Compact Control** (650, 0.8125rem, 1.25rem): Dense carousel selectors and short contextual labels; never paragraph copy.
- **Metadata** (400–500, 0.75rem, 1.5): Credits, counts, and terse reference annotations; never primary reading or action copy.

The default Display and Headline tokens govern reusable page scaffolding. Hero Display, Editorial Headline, and Consultation Display are explicit homepage roles, not arbitrary local exceptions. Their compact-screen values remain owned by those roles: Hero Display becomes `clamp(3.1rem, 12vw, 4rem)` below 44rem and `clamp(2.8rem, 5.2vw, 4.8rem)` on short desktop viewports; Editorial Headline becomes `clamp(3rem, 4.8vw, 3.25rem)` through the tablet composition and `clamp(2.55rem, 11vw, 3rem)` on compact screens; Consultation Display becomes `clamp(2.75rem, 5vw, 4.25rem)` below 48rem and `clamp(3rem, 12vw, 4rem)` below 44rem. The carousel may compact its Editorial Headline to `clamp(2.5rem, 12vw, 3.75rem)` on mobile.

### Named Rules

**The Editorial Contrast Rule.** Newsreader carries atmosphere and narrative hierarchy; Geist carries decisions, values, and actions. Do not use either family as decoration without that role distinction.

## Layout

The global container is centered at a 90rem maximum. Inline gutters grow from 1rem on compact screens to 1.5rem at 40rem, 2rem at 48rem, 3rem at 64rem, and 4rem at 80rem. The base spacing scale is 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, and 128px.

Large editorial surfaces use 12-column grids with deliberately unequal spans; supporting section headers use an 8-column alignment. Image grids mix landscape, portrait, square, and wide ratios to create collected rhythm while preserving exact alignment. Hero regions may use viewport-aware height, but ordinary sections use fluid block padding rather than fixed-height staging.

Responsive composition changes at 40rem, 48rem, 64rem, and 80rem. Mobile begins as one readable column with 1rem gutters; cards and form options expand into two, three, or four columns only when the content can sustain them. Desktop navigation replaces the full-height mobile panel at 64rem. No essential control should require a viewport wider than 20rem.

## Elevation & Depth

The system is layered but grounded. Canvas, surface, image-stage, and graphite sections provide most depth through tonal contrast and fine borders. Shadows are ambient rather than theatrical and appear only on selected card families; navigation, forms, editorial lists, and most catalog cards remain structurally flat.

### Shadow Vocabulary

- **Ambient Card** (`0 1px 2px rgba(85, 58, 38, 0.035), 0 4px 12px rgba(85, 58, 38, 0.02)`): A barely visible material lift for room previews, look cards, featured-product cards, and consultation containers.

### Named Rules

**The Grounded Layer Rule.** Establish hierarchy with tone and rules first; add the Ambient Card shadow only when a bounded surface must read as a handled object.

## Shapes

The form language is rectilinear and architectural. `0` is the sharp baseline, 2px is the standard interactive and card radius, and 6px is the maximum established surface radius. Photography is clipped into decisive rectangles with varied aspect ratios rather than softened containers.

Circles are reserved for intrinsically circular controls, diagram nodes, or furniture-plan geometry. Pills, ornamental blobs, and repeated rounded shells do not belong to this system. Borders are generally 1px; 2px rules are reserved for stronger status, summary, or completion boundaries.

## Components

Components are tactile and restrained: compact enough to feel precise, large enough to operate comfortably, and explicit about state.

### Buttons

- **Shape:** Nearly square with a 2px radius and a 3rem minimum height.
- **Primary:** Oxidized Steel fill and border with Chalk Surface text; 12px by 24px padding and 650-weight Geist label text.
- **Hover / Focus:** Deep Oxidized Steel on hover; a 3px Oxidized Steel focus outline offset by 3px. Press feedback may scale to 0.99 only when reduced motion is not requested.
- **Secondary:** Transparent canvas, Functional Stone border, and Graphite text; hover moves to a Chalk Surface fill and Graphite border.
- **Quiet links:** Underline color reveals on hover rather than adding a new container.

### Chips

- **Style:** 2px radius, 40px minimum height, Functional Stone border, transparent background, and compact Geist label text.
- **State:** Unselected chips remain quiet; selected look controls use Patinated Olive with Chalk Surface text. A small Oxidized Steel mark may communicate a removable active filter.

### Cards / Containers

- **Corner Style:** 2px radius or square for unboxed catalog cards.
- **Background:** Chalk Surface over Plaster Canvas; media sits on Material Stage.
- **Shadow Strategy:** Use Ambient Card only for handled editorial objects. Standard product grids use no shadow and separate copy with a Graphite top rule.
- **Border:** Card Stone for soft bounded cards; Graphite for strong catalog rules.
- **Internal Padding:** Usually 12–16px for card metadata and fluid 20–48px for feature compositions.

### Inputs / Fields

- **Style:** Chalk Surface fill, Functional Stone 1px border, 2px radius, and 12px by 16px padding with labels above.
- **Focus:** Global 3px Oxidized Steel outline offset by 3px.
- **Error / Disabled:** Deep Oxidized Steel 2px error border with a direct text explanation; disabled controls reduce opacity to 0.55 without hiding their label.
- **Choice fields:** Radio options use full-width rows, fine dividers, and tonal selection rather than floating choice cards.

### Navigation

The sticky header uses a Chalk Surface, one Plaster Rule, a Newsreader wordmark, compact Geist links, and a thin Oxidized Steel underline that draws from right to left on hover or focus. Utility actions keep 3rem targets. Below 64rem, primary navigation becomes a full-height Chalk Surface panel with large Newsreader links and numbered Geist metadata.

### Editorial Media Cards

Room, look, and featured-product cards pair decisive image crops with compact factual captions. Image movement is minimal: a 1.8% scale on hover for selected featured cards, a short opacity response for catalog cards, and shared-media view transitions for route continuity. Credits and reference-image disclosures remain visible metadata, never decorative badges.

### Motion Contract

The homepage uses one authored entrance sequence rather than repeated section reveals. When reduced motion is not requested, hero copy resolves over 520–720ms with the expressive ease (`cubic-bezier(0.16, 1, 0.3, 1)`); image frames reveal over 680–780ms and their crops settle over 880–980ms with the material ease (`cubic-bezier(0.2, 0.7, 0.2, 1)`). Delays progress from 60ms to 390ms so the title, support, action, and photography read as one composition. Room imagery may scale to 1.015 over 450ms with the expressive ease on hover or keyboard focus. All entrance animation is absent under `prefers-reduced-motion: reduce`; content remains fully visible at rest.

## Do's and Don'ts

### Do:

- **Do** let large Newsreader type and well-cropped imagery carry the emotional hierarchy.
- **Do** keep Graphite, Plaster Canvas, and Chalk Surface dominant across every page.
- **Do** reserve Oxidized Steel for primary action, focus, error, and meaningful editorial emphasis.
- **Do** use fine rules, exact alignment, and varied image ratios to create architectural rhythm.
- **Do** preserve 44–48px targets for navigation and primary controls, visible focus, reduced-motion behavior, and direct form feedback; 40px chips are reserved for compact filter groups with adequate spacing.
- **Do** label reference imagery, sample content, and fictional commerce behavior transparently.

### Don't:

- **Don't** turn the catalog into playful ecommerce with bright badges, novelty interactions, or gamified urgency.
- **Don't** introduce corporate SaaS styling such as pill-heavy filters, metric cards, glass panels, or blue-purple gradients.
- **Don't** use large corner radii, dramatic shadows, floating shells, or glow effects to manufacture luxury.
- **Don't** center every section or force symmetrical card grids when the editorial hierarchy benefits from asymmetry.
- **Don't** use accent colors as broad background decoration; their scarcity is part of the material language.
- **Don't** hide practical planning details, disclosures, or accessibility states in pursuit of a cleaner composition.
