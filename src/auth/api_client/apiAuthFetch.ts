import * as a from "valibot"
import { createResult, type PromiseResult, resultTryParsingFetchErr } from "#result"
import { envBaseUrlApiResult } from "#src/app/env/public/envBaseUrlApiResult.ts"

export async function apiAuthFetch<T>(
  op: string,
  path: string,
  props: unknown,
  responseSchema?: a.GenericSchema<T>,
): PromiseResult<T> {
  const baseUrlResult = envBaseUrlApiResult()
  if (!baseUrlResult.success) return baseUrlResult
  const baseUrl = baseUrlResult.data

  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(props),
  })
  const text = await response.text()
  if (!response.ok) {
    console.error(op, response.status, response.statusText, text)
    return resultTryParsingFetchErr(op, text, response.status, response.statusText)
  }
  if (responseSchema) {
    const parseResult = a.safeParse(responseSchema, JSON.parse(text))
    if (!parseResult.success) {
      return resultTryParsingFetchErr(op, a.summarize(parseResult.issues), response.status, response.statusText)
    }
    return createResult(parseResult.output)
  }
  return createResult(text as T)
}
