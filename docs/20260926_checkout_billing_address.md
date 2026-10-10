# Eventoren-Checkout: Rechnungsadresse

The checkout contact is also the invoice recipient. Buyers select a private person or company and provide first name, last name, billing email, and postal address. Company billing additionally supports company name, optional company detail, and optional EU VAT ID. Phone is optional. Terms acceptance and privacy acknowledgment are separate and are recorded independently.

Structured billing details are stored with the checkout order and forwarded to Billing for invoice creation. New orders use the submitted billing details; historical orders without them retain the Stripe billing-details fallback. Addresses are not placed in Stripe metadata. Existing checkout drafts and orders without the added fields remain readable.
