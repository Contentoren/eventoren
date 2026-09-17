import { envCheckoutBillingBypassEnabled } from "./envCheckoutBillingBypassEnabled.ts"

export function envCheckoutFormBypassEnabled(): boolean {
  return envCheckoutBillingBypassEnabled() && process.env.PUBLIC_CHECKOUT_FORM_BYPASS === "true"
}
