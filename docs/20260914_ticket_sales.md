# Ticket sales architecture

Eventoren is authoritative for its event catalog, ticket products, inventory, reservations and issued-ticket records. Catalog changes are synchronized to Billing, which uses the persisted Eventoren catalog for checkout and owns payment processing and payment status. Eventoren reserves inventory during checkout and issues tickets only after server-confirmed payment; payment reconciliation and reservation expiry are server-side so browser redirects are not the source of truth.

Public catalog visibility is distinct from administrator access: public queries expose publishable events, while authorized administration can manage records across statuses. The checkout interface and ticket views are clients of these backend contracts, not authorities for inventory or payment state.
