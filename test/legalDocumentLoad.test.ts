import { describe, expect, test } from "bun:test"
import { legalDocumentLoadNameValidate } from "../src/legal/legalDocumentLoadNameValidate.ts"
import { legalDocumentLoadResultToResponse } from "../src/legal/legalDocumentLoadResultToResponse.ts"

describe("legalDocumentLoad", () => {
  test("accepts supported legal document names", () => {
    const result = legalDocumentLoadNameValidate({ name: "agb" })

    expect(result).toEqual({ success: true, data: "agb" })
  })

  test("returns a catalog-coded 400 result for invalid input", () => {
    const result = legalDocumentLoadNameValidate({ name: "unknown" })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result).toMatchObject({
      code: "legal.invalid-document",
      httpStatus: 400,
      op: "legalDocumentLoad",
    })
  })

  test("converts a catalog-coded missing-document result to an HTTP 404 envelope", async () => {
    const response = legalDocumentLoadResultToResponse({
      success: false,
      op: "legalDocumentLoad",
      errorMessage: "Legal document not found",
      code: "legal.not-found",
      httpStatus: 404,
      retryable: false,
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: {
        code: "legal.not-found",
        status: 404,
        op: "legalDocumentLoad",
      },
    })
  })
})
