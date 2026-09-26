import { describe, expect, test } from "bun:test"
import { e2eEnvironmentRead } from "../e2e/config/e2eEnvironmentRead.ts"

describe("E2E environment configuration", () => {
  test("defaults to the production target and forwards configured Mailcow variables", () => {
    const result = e2eEnvironmentRead({
      TEST_CUSTOMER_MAILCOW_HOST: "mail.example.test",
      TEST_CUSTOMER_MAILCOW_PASSWORD: "secret",
      UNRELATED_VALUE: "ignored",
    })

    expect(result).toEqual({
      success: true,
      data: {
        target: "production",
        baseUrl: "https://eventoren.de",
        authUsername: undefined,
        authPassword: undefined,
        mailcow: {
          TEST_CUSTOMER_MAILCOW_HOST: "mail.example.test",
          TEST_CUSTOMER_MAILCOW_PASSWORD: "secret",
        },
      },
    })
  })

  test("selects the development origin only with an explicit target and forwards auth values", () => {
    const result = e2eEnvironmentRead({
      E2E_TARGET: "development",
      E2E_BASE_URL: "https://eventoren.leonardomora.de/",
      E2E_AUTH_USERNAME: " admin ",
      E2E_AUTH_PASSWORD: "password",
    })

    expect(result).toEqual({
      success: true,
      data: {
        target: "development",
        baseUrl: "https://eventoren.leonardomora.de",
        authUsername: "admin",
        authPassword: "password",
        mailcow: {},
      },
    })
  })

  test("rejects malformed, custom, cross-target and noncanonical URLs", () => {
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "not a URL" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "file:///tmp/page" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "http://localhost:4173/" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "https://eventoren.leonardomora.de" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_TARGET: "development", E2E_BASE_URL: "https://eventoren.de" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_TARGET: "preview" }).success).toBe(false)
  })
})
