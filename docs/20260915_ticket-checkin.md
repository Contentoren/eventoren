# Organizer ticket access and check-in

Organizer access is role-based and enforced by the backend. Organizers can access events whose start time is on or after their server-recorded invitation/assignment time; administrators are not subject to this date boundary. Revoking and granting organizer access again starts a new access period. Event assignments are not used as a separate authorization layer.

Each issued ticket is checked in independently. Only paid, non-cancelled tickets are eligible. Check-in validation and state change are atomic, so duplicate or concurrent attempts cannot check a ticket in twice. Resetting an active check-in preserves its history and allows a later check-in. QR resolution is scoped to the selected event; manual code entry remains available independently of camera access.

Participant names belong to individual tickets and remain distinct from the purchaser's contact details. Older tickets without participant names remain readable and use the purchaser as an explicitly identified fallback.
