# Zweite Hero Variation (Exakte LiveNation Replikation)

## Goal
Replicate the exact LiveNation hero section from the provided screenshot: a multi-slide peek carousel with bold artist name, red "TICKETS & INFOS" CTA, bottom dots + pause button, side chevron navigation, followed by the dark section with "Alle Konzerte und Shows im Überblick" heading and the 4-part search bar ([Genres] [Alle Städte] [Datum] [Events suchen]).

## Decisions
- **Visual Design 1:1 matching screenshot**:
  - Multi-slide carousel viewport with center active slide and left/right adjacent slides peeking out.
  - Slide overlay: Bold artist title ("Jorja Smith", "Teddy Swims", "Linkin Park", etc.) and bright LiveNation red button "TICKETS & INFOS" (`#e11242` / `bg-[#e11242]`).
  - Carousel navigation:
    - Floating white circular buttons with red chevrons (`<` and `>`) overlapping the slide boundaries.
    - Bottom center pagination dots (red active dot, white dots) and a pause/play toggle button (`||`).
  - Sub-hero section:
    - Dark background with centered heading: **"Alle Konzerte und Shows im Überblick"** (`text-2xl sm:text-3xl font-bold text-white`).
    - Integrated LiveNation 4-element search bar:
      - 🎵 `Genres` dropdown (dark filled `#262626`, light border, music icon)
      - 📍 `Alle Städte` search input (dark filled, location pin icon)
      - 📅 `DD.MM.YYYY – DD.MM.YYYY` date/time window select (dark filled, calendar icon)
      - Red submit button `Events suchen` (`bg-[#e11242] text-white font-bold`)
  - Strict minimum font size $\ge$ 14px (`text-sm`+) everywhere.

## Approach
1. Update `src/events/eventHeroShowcaseStateCreate.ts` with multi-slide peek calculation, pause/play toggle, slide list with matching artists/images, and filter synchronization.
2. Update `src/events/EventHeroShowcase.tsx` to render the exact LiveNation layout from the screenshot.
3. Update `src/events/EventFilterBar.tsx` / search bar styling if needed to match the screenshot's exact dark inputs and red button.
4. Verify with `bun run typecheck`, `bun run build`, and `bunx biome check`.

## Tasks
- [x] Task 1: Update `src/events/eventHeroShowcaseStateCreate.ts` for carousel state & pause toggle
- [ ] Task 2: Rebuild `src/events/EventHeroShowcase.tsx` to match the screenshot layout 1:1
- [ ] Task 3: Full verification with typecheck and build
