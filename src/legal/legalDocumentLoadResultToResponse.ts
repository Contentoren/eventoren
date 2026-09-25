import type { legalDocumentLoadNameValidate } from "./legalDocumentLoadNameValidate.ts"

type LegalDocumentLoadError = Extract<ReturnType<typeof legalDocumentLoadNameValidate>, { success: false }>

export function legalDocumentLoadResultToResponse(result: LegalDocumentLoadError): Response {
  const status = result.httpStatus
  return new Response(
    JSON.stringify({
      error: {
        code: result.code,
        message: result.errorMessage,
        op: result.op,
        status,
        retryable: result.retryable,
        details: {},
      },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  )
}
