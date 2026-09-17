import { afterEach, expect, test } from "bun:test"
import { envCheckoutFormBypassEnabled } from "../src/app/env/public/envCheckoutFormBypassEnabled.ts"

afterEach(() => {
  delete process.env.PUBLIC_ENV_MODE
  delete process.env.PUBLIC_CHECKOUT_BILLING_BYPASS
  delete process.env.PUBLIC_CHECKOUT_FORM_BYPASS
})

test("enables direct fixture checkout only with both explicit development switches", () => {
  process.env.PUBLIC_ENV_MODE = "development"
  process.env.PUBLIC_CHECKOUT_BILLING_BYPASS = "true"
  process.env.PUBLIC_CHECKOUT_FORM_BYPASS = "true"

  expect(envCheckoutFormBypassEnabled()).toBe(true)
})

test("does not enable direct fixture checkout without the billing bypass", () => {
  process.env.PUBLIC_ENV_MODE = "development"
  process.env.PUBLIC_CHECKOUT_FORM_BYPASS = "true"

  expect(envCheckoutFormBypassEnabled()).toBe(false)
})

test("does not enable direct fixture checkout in production", () => {
  process.env.PUBLIC_ENV_MODE = "production"
  process.env.PUBLIC_CHECKOUT_BILLING_BYPASS = "true"
  process.env.PUBLIC_CHECKOUT_FORM_BYPASS = "true"

  expect(envCheckoutFormBypassEnabled()).toBe(false)
})
