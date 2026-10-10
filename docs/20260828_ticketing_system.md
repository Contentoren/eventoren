# Ticketing architecture and conventions

Eventoren separates event discovery and event-domain behavior from ticket sales and order lifecycle behavior. Ticket orders, inventory, reservations and issued ticket identity are authoritative in Eventoren; payment state comes from Billing and tickets are issued only after server-confirmed payment. Guest purchase and order access are supported, while organizer and admin operations retain backend authorization.

For TypeScript modules, keep state/behavior separate from view-only components, use subject-first module names, and return typed `Result` values for expected failures rather than throwing. Reuse the shared UI components and semantic design tokens.
