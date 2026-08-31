# Dritte Hero Variation (Magnific Replikation)

## Goal
Replicate the exact Magnific hero section from the provided screenshot:
- Full cinematic backdrop with warm terracotta/crimson grading, atmospheric lighting, and high-impact center imagery.
- Left-aligned content:
  - Translucent pill badge with pink arrow.
  - Large bold white headline.
  - High-contrast white subheadline.
  - Solid white primary CTA button (`bg-white text-black font-bold`) and outline secondary button with play icon (`border border-white text-white`).
- Right-aligned vertical ticker:
  - Magenta triangle pointer (`fill-[#e11242]` / `#ec4899`).
  - Active item in bright bold white, inactive items fading out smoothly towards top and bottom.
- Bottom social proof:
  - Centered white text ("Trusted by 1M+ subscribers..." / "Vertraut von über 500.000 Fans & Partner-Veranstaltern").
  - Monochrome white logo strip (Coca-Cola, Ogilvy, R/GA, Wonder, GUESS, Delivery Hero / partners).

## Decisions
- Visual fidelity:
  - Use high-quality atmospheric background matching the screenshot's crimson/terracotta cinematic aesthetic.
  - Strict minimum font size $\ge$ 14px (`text-sm`+).
  - Rounded tokens (`rounded-control` = 12px, `rounded-card` = 16px).
  - View-only `.tsx` component driven by `eventHeroMagnificStateCreate.ts`.

## Tasks
- [x] Task 1: Update `src/events/eventHeroMagnificStateCreate.ts` with ticker opacity gradient mapping and partner logos matching the screenshot
- [x] Task 2: Rebuild `src/events/EventHeroMagnific.tsx` with cinematic background, white CTAs, vertical wheel with magenta pointer & fading list, and bottom logo strip
- [x] Task 3: Verify build, typecheck, and formatting
