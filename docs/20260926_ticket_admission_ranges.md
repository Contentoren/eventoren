# Ticketprodukt: zusätzliche Einlasszeiträume

The primary `doorsAt` value remains a single timestamp. Additional admissions are stored as ranges with `startsAt` and `endsAt`; each range must be complete, parseable, and end after its start before a product can be saved.

Legacy additional-admission entries stored as single timestamps remain readable. The editor shows the legacy start with an empty end rather than inventing a duration; the user must provide an end or remove that entry before saving. Additional ranges are catalog/admin data and are not currently consumed by ticket or order rendering.
