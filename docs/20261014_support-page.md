# Public support page

## Goal
Provide a publicly accessible `/support` URL suitable for Stripe customer-support requirements and link it from public footers.

## Decisions and scope
- Use German copy and the existing public page layout, SEO helpers, and shared `#ui/...` components.
- Display `kontakt@eventoren.de` as explicitly requested, with a working email link.
- Include the telephone and other appropriate contact methods already published on the official website, using verified public details only. Link to `/kontakt` for the existing contact form.
- Include a Support link in both public footer implementations so home and public content pages expose it. Keep existing links intact and respect existing demo link behavior.
- Do not change existing contact/legal details, introduce a support form, add dependencies, or deploy backend changes.
- Follow the existing Europe/Berlin convention for any displayed hours; do not invent availability promises.

## Approach
1. Verify live public contact details and inspect route/footer integration.
2. Implement the smallest `/support` page with SEO metadata, verified contact links, and footer links; regenerate route metadata using the existing tooling.
3. Review the diff and run focused static/build checks and browser verification of the new page and footer navigation.
4. Follow the `/commits` skill to commit and push the changes, then deploy the frontend to production and verify the live support URL.

## Tasks and status
- Task 1: Project exploration and public website contact verification complete.
- Task 2: Implementation complete.
- Task 3: Static checks, independent review, targeted regression coverage, and desktop/mobile browser verification complete.
- Task 4: Feature committed and pushed; production frontend deployed and live support page verified.

## Current context
- Working directory: `/home/leo/projects/eventoren`; initial branch `main` and working tree clean.
- Routes use TanStack file routing; existing `/kontakt` and legal pages use `SiteFrame`.
- Public footers are `src/components/SiteFooter.tsx` and `src/marketing/Footer.tsx`.
- Frontend-only production deployment command: `bun run frontend:deploy:production`.
- Inspect actual package scripts before selecting targeted validation; avoid the full test suite for this isolated page change.
- `/support` uses the requested email, the published telephone `+49 30 58849210`, the operator postal address, and a link to the existing contact form. Existing contact-page and imprint email addresses remain unchanged.
- Public footer integration includes root-footer suppression and demo footer destination handling to preserve existing layout behavior.
- Existing footer regression coverage includes `/support` among the public SiteFrame routes.
- Production support URL: `https://eventoren.de/support`.
- Production deployment uses the committed support revision only; unrelated concurrent working-tree edits remain preserved and were excluded from deployment.
