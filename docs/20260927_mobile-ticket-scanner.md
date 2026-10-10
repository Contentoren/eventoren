# Mobile ticket-scanner views

On admin and organizer management routes, the mobile bottom navigation keeps Profile available. The organizer event scanner area adds Scanner and Tickets destinations; public storefront and standalone share-link pages do not use this management navigation. Profile renders the shared authorized sidebar content inline above the persistent bar, without duplicating account or authorization logic.

Tickets is the initial event-scanner view. Search and ticket selection remain URL-backed across view changes. Selecting a ticket expands its details inline in the list; the existing check-in action appears first and optional details are separately collapsible. Ticket identity is not repeated in the expanded detail. Existing check-in eligibility and reset authorization still govern actions.

Scanner view starts the existing rear-camera scanner on entry and stops camera tracks on exit or unmount, including a late camera-start completion. It retains duplicate/in-flight scan protection and the existing check-in operation. Mobile scan outcomes are transient text feedback; success is shown only after confirmed check-in. Camera permission and device errors remain visible, and re-entering Scanner can retry. Manual ticket-code entry and scanner controls remain available on desktop, not in the mobile camera-only view.

The mobile bottom bar accounts for the device safe area. View state and search/selection context are retained when switching between Tickets, Scanner, and Profile; navigation outside the scanner area returns to the Profile-only management navigation.
