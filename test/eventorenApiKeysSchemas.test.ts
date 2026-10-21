import { describe, expect, test } from "bun:test"
import * as va from "valibot"
import { apiKeyCreateInputSchema } from "#src/auth/model/apiKeyCreateInputSchema.ts"
import { apiKeyNameSchema } from "#src/auth/model/apiKeyNameSchema.ts"
import { apiKeyListResultSchema } from "#src/auth/model/apiKeyListResultSchema.ts"
import { apiKeyRenameInputSchema } from "#src/auth/model/apiKeyRenameInputSchema.ts"
import { apiKeyRevokeInputSchema } from "#src/auth/model/apiKeyRevokeInputSchema.ts"
import { apiKeyRotateInputSchema } from "#src/auth/model/apiKeyRotateInputSchema.ts"

describe("api-key input schemas", () => {
  test("create requires a name and accepts an expiry preset", () => {
    expect(va.safeParse(apiKeyCreateInputSchema, { token: "t", name: "cli" }).success).toBe(true)
    expect(va.safeParse(apiKeyCreateInputSchema, { token: "t", name: "cli", expiryPreset: "1-month" }).success).toBe(
      true,
    )
    expect(va.safeParse(apiKeyCreateInputSchema, { token: "t" }).success).toBe(false)
    expect(va.safeParse(apiKeyNameSchema, "").success).toBe(false)
    expect(va.safeParse(apiKeyNameSchema, "  cli  ").output).toBe("cli")
  })

  test("rename/revoke/rotate require a non-empty id", () => {
    expect(va.safeParse(apiKeyRenameInputSchema, { token: "t", id: "k1", name: "new" }).success).toBe(true)
    expect(va.safeParse(apiKeyRenameInputSchema, { token: "t", id: "", name: "new" }).success).toBe(false)
    expect(va.safeParse(apiKeyRevokeInputSchema, { token: "t", id: "k1" }).success).toBe(true)
    expect(va.safeParse(apiKeyRevokeInputSchema, { token: "t", id: "" }).success).toBe(false)
    expect(va.safeParse(apiKeyRotateInputSchema, { token: "t", id: "k1" }).success).toBe(true)
    expect(va.safeParse(apiKeyRotateInputSchema, { token: "t", id: "" }).success).toBe(false)
  })

  test("list result accepts a masked-key page", () => {
    const parsed = va.safeParse(apiKeyListResultSchema, {
      success: true,
      data: {
        page: [
          {
            id: "k1",
            name: "cli",
            maskedCredential: "abc…xyz",
            createdAt: "2024-01-01T00:00:00.000Z",
            status: "active",
          },
        ],
        isDone: true,
        continueCursor: "",
      },
    })
    expect(parsed.success).toBe(true)
  })
})
