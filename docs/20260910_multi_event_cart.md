# Multi-event cart behavior

The cart draft can contain ticket selections for multiple events and is persisted locally. The cart presents selections grouped by event and aggregates their quantities and totals; the header count includes tickets across all groups. A direct checkout can also target one event without first using the cart.

Checkout processes each event as a separate order. A cart spanning several events is therefore not consolidated into one cross-event payment/order or confirmation. Cart changes are local drafts; authoritative inventory and ticket issuance remain server-side. Multi-event payment sequencing should not be inferred from the cart display alone.
