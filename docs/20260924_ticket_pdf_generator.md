# Ticket PDF generator template

## Goal
Render Eventoren ticket PDFs through the existing Typst pdf-generator service with a template similar to Billing's current HTML: four tickets per A4 page, QR codes, event/admission details, and German/English labels.

## Decisions and scope
- Work in `/home/leo/projects/pdf-generator` and `/home/leo/projects/billing`. The latter already has a ticket PDF service integration; preserve it and all pre-existing changes.
- Use `/home/leo/projects/deploy/billing/src/checkout/server/eventorenTicketHtmlCreate.ts` as the visual reference only. Do not modify deployment worktrees or deploy services.
- Preserve existing generator clients' default ticket layout; select the new Eventoren template using an optional request field.
- Preserve Billing's caching, timeouts, validation, and fulfillment contract. Include template selection in cache identity if necessary.
- Reuse existing dependencies. Native Typst avoids Chromium startup; make no measured speed claim without a benchmark.

## Tasks
1. Completed: extend generator request schema and add an Eventoren Typst template matching HTML layout and localized details; add and run focused schema/template/backend tests.
2. Completed: update Billing's existing service request mapping to select the template and forward locale/details; update focused tests and relevant current behavior documentation.
3. Completed: independently verify integration and rendered PDF appearance/pagination using representative German/English tickets; review final diff scope.

## Current context
Eventoren depends on a vendored Billing client package; PDF orchestration is server-side in Billing, so no Eventoren UI change or package refresh is expected. Billing source and deployment worktrees differ. Target the existing source service integration, not the old Chromium implementation.
The generator now accepts `template: "eventoren"`, `locale: "de" | "en"`, and existing ticket fields plus eventEndsAt, ticketId, tierKey and sequence; the Eventoren variant requires doors time, venue and city. Default requests retain their previous layout. Billing maps its existing fulfillment fields to this variant.
Billing now selects this template and includes all required fields; its renderer cache version distinguishes the new layout. Release the updated generator service and rebuilt client package before the updated Billing service.
