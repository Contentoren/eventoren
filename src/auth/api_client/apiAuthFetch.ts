import * as a from "valibot"
import { createResult, createResultError, type PromiseResult, resultTryParsingFetchErr } from "#result"
import { envBaseUrlApiResult } from "#src/app/env/public/envBaseUrlApiResult.ts"
import { eventorenSessionAdoptServerFn } from "#src/auth/server/eventorenSessionAdoptServerFn.ts"

export async function apiAuthFetch<T>(
  op: string,
  path: string,
  props: unknown,
  responseSchema?: a.GenericSchema<T>,
  options: { readonly sessionAdoption?: "legacy" | "replace" } = {},
): PromiseResult<T> {
  const baseUrlResult = envBaseUrlApiResult()
  if (!baseUrlResult.success) return baseUrlResult
  const baseUrl = baseUrlResult.data

  let response: Response
  let text: string
  try {
    response = await fetch(baseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(props),
    })
    text = await response.text()
  } catch (error) {
    return createResultError(op, error instanceof Error ? error.message : String(error))
  }
  if (!response.ok) {
    console.error(op, response.status, response.statusText, text)
    return resultTryParsingFetchErr(op, text, response.status, response.statusText)
  }
  if (responseSchema) {
    let responseData: unknown
    try {
      responseData = JSON.parse(text)
    } catch (error) {
      return createResultError(op, error instanceof Error ? error.message : String(error))
    }
    const parseResult = a.safeParse(responseSchema, responseData)
    if (!parseResult.success) {
      return resultTryParsingFetchErr(op, a.summarize(parseResult.issues), response.status, response.statusText)
    }
    if (options.sessionAdoption) {
      const token =
        isRecord(parseResult.output) && typeof parseResult.output.token === "string" ? parseResult.output.token : ""
      if (!token)
        return resultTryParsingFetchErr(
          op,
          "The authenticated response did not contain a session.",
          500,
          "Invalid session",
        )
      try {
        const adoptionResult = await eventorenSessionAdoptServerFn({ data: { token, mode: options.sessionAdoption } })
        if (!adoptionResult.success)
          return resultTryParsingFetchErr(op, adoptionResult.errorMessage, 401, "Session adoption failed")
      } catch (error) {
        return resultTryParsingFetchErr(
          op,
          error instanceof Error ? error.message : String(error),
          503,
          "Session adoption failed",
        )
      }
    }
    return createResult(parseResult.output)
  }
  return createResult(text as T)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
