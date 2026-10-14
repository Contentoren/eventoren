import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { envAppleWalletEnabled } from "./envAppleWalletEnabled.ts"

describe("envAppleWalletEnabled", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.PUBLIC_APPLE_WALLET_PASS_TYPE_ID
    delete process.env.VITE_APPLE_WALLET_PASS_TYPE_ID
    delete process.env.PUBLIC_APPLE_WALLET_ENABLED
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns false when all env variables are unset", () => {
    expect(envAppleWalletEnabled()).toBe(false)
  })

  it("returns true when PUBLIC_APPLE_WALLET_PASS_TYPE_ID is present", () => {
    process.env.PUBLIC_APPLE_WALLET_PASS_TYPE_ID = "pass.com.eventoren.ticket"
    expect(envAppleWalletEnabled()).toBe(true)
  })

  it("returns true when VITE_APPLE_WALLET_PASS_TYPE_ID is present", () => {
    process.env.VITE_APPLE_WALLET_PASS_TYPE_ID = "pass.com.eventoren.ticket"
    expect(envAppleWalletEnabled()).toBe(true)
  })

  it("returns true when PUBLIC_APPLE_WALLET_ENABLED is 'true'", () => {
    process.env.PUBLIC_APPLE_WALLET_ENABLED = "true"
    expect(envAppleWalletEnabled()).toBe(true)
  })

  it("returns false when PUBLIC_APPLE_WALLET_ENABLED is 'false'", () => {
    process.env.PUBLIC_APPLE_WALLET_ENABLED = "false"
    expect(envAppleWalletEnabled()).toBe(false)
  })

  it("returns false when env variables are empty strings", () => {
    process.env.PUBLIC_APPLE_WALLET_PASS_TYPE_ID = ""
    process.env.VITE_APPLE_WALLET_PASS_TYPE_ID = ""
    process.env.PUBLIC_APPLE_WALLET_ENABLED = ""
    expect(envAppleWalletEnabled()).toBe(false)
  })
})
