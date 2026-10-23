# Ticket checkout / settlement fee accounting

New orders freeze `feeSnapshot` (payer, total platform fee and organizer deduction).
Fees are computed per paid ticket with the configured basis points and fixed cents,
then multiplied by quantity; free tickets have no fee. Ordinary payment processing
is included: settlement makes no separate PSP deduction.

Buyer payer: order total = ticket subtotal + service fee; organizer entitlement =
ticket subtotal. Organizer payer: order total = ticket subtotal; entitlement =
subtotal minus the snapshotted fee. Tier writes and checkout reject organizer fees
greater than the ticket price; repricing existing tiers cannot bypass checkout's guard.

Finance `grossCents` remains ticket subtotal, `feeCents` means organizer deductions,
and `disputeCents` reverses the organizer's net entitlement only. Buyer service fees
must never be deducted again on cancellation. This does not implement additional
refund, chargeback or exceptional payment-provider fee schedules.

Legacy orders without the optional snapshot keep all stored amounts unchanged.
Their `feeCents` was added to the buyer total, so organizer deduction falls back to
zero. No historical organizer fee is inferred from current organization settings.
An organizer-absorbed fee not captured historically cannot be reconstructed safely.
No backfill or order repricing is performed.

This fixes existing shared checkout/finance behavior, not a new public operation;
the live-query dashboard, CLI, HTTP and client APIs reuse the existing finance path.
