export function envCheckoutBillingBypassEnabled(): boolean {
  const mode = process.env.PUBLIC_ENV_MODE
  return (mode === "development" || mode === "preview") && process.env.PUBLIC_CHECKOUT_BILLING_BYPASS === "true"
}
