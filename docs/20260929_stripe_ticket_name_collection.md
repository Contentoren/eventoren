# Stripe-Angaben für Eventoren-Ticket-Checkout

Für Eventoren-Ticket-Checkout-Sessions verlangt Billing sowohl bei der erstmaligen Session-Erstellung als auch bei einem Retry die Rechnungsadresse (`billing_address_collection: "required"`) und die individuelle Namensangabe (`name_collection.individual.enabled: true`). Diese Einstellung ist Eventoren-Tickets vorbehalten; sie darf nicht ungeprüft auf andere Checkout-Arten übertragen werden.

Die Teilnehmernamen je Ticket sind ein separates Eventoren-Checkout-Feld und werden von Eventoren am Checkout validiert und dem jeweiligen Ticket zugeordnet. Sie ersetzen nicht die Stripe-Namensangabe des Käufers. Rechnungsdetails, die die Bestellansicht zeigt, stammen aus den tatsächlich gelieferten Stripe-Zahlungsdaten; fehlende Angaben dürfen nicht abgeleitet oder mit anderen Stripe-Feldern vermischt werden.

Umsetzung: `billing/src/checkout/server/eventorenTicketCheckoutHandlerCreate.ts` und `billing/src/payments/stripeCheckoutSessionCreate.ts`; Teilnehmernamen: `eventoren/src/ticketing/convex/ticketCheckoutPrepareMutation.ts`.
