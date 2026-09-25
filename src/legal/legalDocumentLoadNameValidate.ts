import { createResult, createResultError, type Result, type ResultOk } from "#result"
import { legalErrorCatalog } from "./legalErrorCatalog.ts"

type LegalDocumentName = "agb" | "impressum"
type LegalDocumentLoadError = Extract<Result<never>, { success: false }> & {
  readonly code: string
  readonly httpStatus: number
  readonly retryable: boolean
}

export function legalDocumentLoadNameValidate(data: unknown): ResultOk<LegalDocumentName> | LegalDocumentLoadError {
  const op = "legalDocumentLoad"
  if (!data || typeof data !== "object" || typeof (data as { name?: unknown }).name !== "string") {
    return {
      ...createResultError(op, "Missing legal document name"),
      ...legalErrorCatalog.invalidDocument,
    }
  }

  const name = (data as { name: string }).name
  if (name !== "agb" && name !== "impressum") {
    return {
      ...createResultError(op, "Unknown legal document name"),
      ...legalErrorCatalog.invalidDocument,
    }
  }

  return createResult(name)
}
