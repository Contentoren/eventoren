# Post-Checkout Redirect and Thank-You Banner

## Goal
Redirect users to the homepage directly after booking/purchasing a ticket and display a thank-you banner informing them that they will shortly receive an email with all information and their ticket.

## Decisions
- Perform navigation to `/` with search query parameter (`buchung: "erfolgreich"`) upon successful payment confirmation.
- Support the query parameter in the homepage search schema / parser so it is preserved and recognized.
- Display a prominent, accessible notification banner on the homepage thanking the user and stating that they will receive an email shortly with all information and their ticket.
- Keep the banner dismissible and cleanly styled in accordance with existing Tailwind design system.

## Approach
1. Update `eventDiscoverySearchParse.ts` / search schema to recognize the booking success parameter.
2. Add a thank-you notification banner on the homepage (`src/routes/index.tsx`) shown when the booking success parameter is present.
3. Update checkout form completion (`src/ticketing/TicketCheckoutForm.tsx` or `ticketCheckoutFormStateCreate.ts`) to trigger navigation to `/` with the booking success query param upon payment confirmation.
4. Verify end-to-end checkout flow using automated tests and browser verification.

## Tasks
- [x] Task 1: Update homepage search parsing and add thank-you banner component on the homepage.
- [x] Task 2: Trigger redirect to homepage with success parameter upon checkout confirmation.
- [x] Task 3: Verify the checkout flow and homepage banner in browser and run tests.
