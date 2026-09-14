import { createResult, createResultError, type PromiseResult } from "#result"

export async function ticketAccessDigestCreate(accessToken: string): PromiseResult<string> {
  const op = "ticketAccessDigestCreate"
  try {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(accessToken))
    const digest = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
    return createResult(digest)
  } catch (error) {
    return createResultError(op, "Guest access could not be secured", String(error))
  }
}
