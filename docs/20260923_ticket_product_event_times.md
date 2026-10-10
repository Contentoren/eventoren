# Ticketprodukt-Zeiten

Ticket product start, doors, and end times describe the event for that product, not its sales period. New products and legacy products without their own times initially inherit the event's times. Once saved, product times remain independent of later event-time changes.

Start and end are required when saving and the end must follow the start. Doors time is optional and falls back to start when absent. Legacy stored product times remain readable; older tiers without explicit values are projected using the event times. These fields affect the admin product editor and catalog data, not checkout, PDFs, or Billing synchronization.
