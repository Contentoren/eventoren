import { afterEach, expect, test } from "bun:test"
import { envCheckoutBillingBypassEnabled } from "../src/app/env/public/envCheckoutBillingBypassEnabled.ts"

afterEach(() => {
  delete process.env.PUBLIC_ENV_MODE
  delete process.env.PUBLIC_CHECKOUT_BILLING_BYPASS
})

test("enables the checkout fallback only for an explicit development setting", () => {
  process.env.PUBLIC_ENV_MODE = "development"
  process.env.PUBLIC_CHECKOUT_BILLING_BYPASS = "true"

  expect(envCheckoutBillingBypassEnabled()).toBe(true)
})

test("does not enable the checkout fallback in production", () => {
  process.env.PUBLIC_ENV_MODE = "production"
  process.env.PUBLIC_CHECKOUT_BILLING_BYPASS = "true"

  expect(envCheckoutBillingBypassEnabled()).toBe(false)
})

test("enables the checkout fallback for an explicitly named preview mode", () => {
  process.env.PUBLIC_ENV_MODE = "preview"
  process.env.PUBLIC_CHECKOUT_BILLING_BYPASS = "true"

  expect(envCheckoutBillingBypassEnabled()).toBe(true)
})

test("does not enable the checkout fallback without the explicit flag", () => {
  process.env.PUBLIC_ENV_MODE = "development"

  expect(envCheckoutBillingBypassEnabled()).toBe(false)
})
