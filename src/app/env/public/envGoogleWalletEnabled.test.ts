import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { envGoogleWalletEnabled } from "./envGoogleWalletEnabled.ts"

describe("envGoogleWalletEnabled", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.PUBLIC_GOOGLE_WALLET_ISSUER_ID
    delete process.env.VITE_GOOGLE_WALLET_ISSUER_ID
    delete process.env.PUBLIC_GOOGLE_WALLET_ENABLED
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns false when all env variables are unset", () => {
    expect(envGoogleWalletEnabled()).toBe(false)
  })

  it("returns true when PUBLIC_GOOGLE_WALLET_ISSUER_ID is present", () => {
    process.env.PUBLIC_GOOGLE_WALLET_ISSUER_ID = "3388000000022221111"
    expect(envGoogleWalletEnabled()).toBe(true)
  })

  it("returns true when VITE_GOOGLE_WALLET_ISSUER_ID is present", () => {
    process.env.VITE_GOOGLE_WALLET_ISSUER_ID = "3388000000022221111"
    expect(envGoogleWalletEnabled()).toBe(true)
  })

  it("returns true when PUBLIC_GOOGLE_WALLET_ENABLED is 'true'", () => {
    process.env.PUBLIC_GOOGLE_WALLET_ENABLED = "true"
    expect(envGoogleWalletEnabled()).toBe(true)
  })

  it("returns false when PUBLIC_GOOGLE_WALLET_ENABLED is 'false'", () => {
    process.env.PUBLIC_GOOGLE_WALLET_ENABLED = "false"
    expect(envGoogleWalletEnabled()).toBe(false)
  })

  it("returns false when env variables are empty strings", () => {
    process.env.PUBLIC_GOOGLE_WALLET_ISSUER_ID = ""
    process.env.VITE_GOOGLE_WALLET_ISSUER_ID = ""
    process.env.PUBLIC_GOOGLE_WALLET_ENABLED = ""
    expect(envGoogleWalletEnabled()).toBe(false)
  })
})
