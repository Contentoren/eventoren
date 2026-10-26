import type { ContactInquiryType } from "./contactPageStateCreate.ts"

const organizerMailTo = "mailto:partner@eventoren.de"
const supportMailTo = "mailto:support@eventoren.de"

/** Already-published contact address for the selected inquiry type. No new address is invented here. */
export function contactMailToGet(inquiryType: ContactInquiryType): string {
  if (inquiryType === "support") return supportMailTo
  return organizerMailTo
}
