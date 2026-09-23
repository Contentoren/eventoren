import { describe, expect, test } from "bun:test"
import { e2eEnvironmentRead } from "../e2e/config/e2eEnvironmentRead.ts"

describe("E2E environment configuration", () => {
  test("uses the preview URL by default and forwards configured Mailcow variables", () => {
    const result = e2eEnvironmentRead({
      TEST_CUSTOMER_MAILCOW_HOST: "mail.example.test",
      TEST_CUSTOMER_MAILCOW_PASSWORD: "secret",
      UNRELATED_VALUE: "ignored",
    })

    expect(result).toEqual({
      success: true,
      data: {
        baseUrl: "https://eventoren.leonardomora.de",
        authUsername: undefined,
        authPassword: undefined,
        mailcow: {
          TEST_CUSTOMER_MAILCOW_HOST: "mail.example.test",
          TEST_CUSTOMER_MAILCOW_PASSWORD: "secret",
        },
      },
    })
  })

  test("accepts a custom HTTP(S) preview URL and explicit auth environment values", () => {
    const result = e2eEnvironmentRead({
      E2E_BASE_URL: "http://localhost:4173/",
      E2E_AUTH_USERNAME: " admin ",
      E2E_AUTH_PASSWORD: "password",
    })

    expect(result).toEqual({
      success: true,
      data: {
        baseUrl: "http://localhost:4173",
        authUsername: "admin",
        authPassword: "password",
        mailcow: {},
      },
    })
  })

  test("rejects malformed and non-HTTP(S) target URLs", () => {
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "not a URL" }).success).toBe(false)
    expect(e2eEnvironmentRead({ E2E_BASE_URL: "file:///tmp/page" }).success).toBe(false)
  })
})
