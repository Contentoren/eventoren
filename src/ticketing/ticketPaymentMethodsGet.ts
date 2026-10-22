import type { CatalogImage } from "@adaptive-ds/assets-service"
import { imageList } from "../app/assets/imageList.ts"
import type { EventItem } from "../events/EventItem.ts"

export interface TicketPaymentBrandIcon {
  readonly image: Pick<CatalogImage, "path">
  readonly alt: string
}

export interface TicketPaymentMethodBrand {
  readonly method: string
  readonly label: string
  readonly icons: readonly TicketPaymentBrandIcon[]
}

export const ticketPaymentMethodBrands: readonly TicketPaymentMethodBrand[] = [
  {
    method: "card",
    label: "Kredit-/Debitkarten (Apple Pay / Google Pay, sofern verfügbar)",
    icons: [
      { image: imageList.payment_methods_visa_alternate, alt: "Visa" },
      { image: imageList.payment_methods_mastercard, alt: "Mastercard" },
      { image: imageList.payment_methods_maestro, alt: "Maestro" },
      { image: imageList.payment_methods_american_express, alt: "American Express" },
      { image: imageList.payment_methods_discover, alt: "Discover" },
    ],
  },
  {
    method: "klarna",
    label: "Klarna",
    icons: [{ image: imageList.payment_methods_klarna_sofort, alt: "Klarna" }],
  },
  {
    method: "sepa_debit",
    label: "SEPA-Lastschrift",
    icons: [{ image: imageList.payment_methods_sepa, alt: "SEPA" }],
  },
  { method: "bancontact", label: "Bancontact", icons: [] },
]

export function ticketPaymentMethodsGet(
  events: readonly Pick<EventItem, "allowedStripePaymentMethods">[],
): readonly TicketPaymentMethodBrand[] {
  if (!events.length) return []
  return ticketPaymentMethodBrands.filter(({ method }) =>
    events.every((event) => {
      const policy = event.allowedStripePaymentMethods
      return !policy?.length || policy.some((allowed) => allowed === method)
    }),
  )
}
