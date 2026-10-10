# Order payment details

The admin order detail view combines Eventoren's locally stored order/contact information with payment details returned by the authenticated, organization-scoped Billing integration. Access to payment details is admin-protected in Eventoren and must remain protected by Billing authorization as well. Public order-status responses must not expose personal payment details.

Only payment details actually returned by Stripe are displayed; full card numbers and CVC are never exposed. Historical sessions may not contain a billing address or card details. If remote details are absent or unavailable, local order information remains visible and the missing payment data is represented as unavailable rather than inferred.
