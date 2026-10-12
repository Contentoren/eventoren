import { createResult, createResultError } from "#result"
import { e2eEnvironmentRead } from "./e2eEnvironmentRead.ts"
import { e2eTicketTargetCheck } from "./e2eTicketTargetCheck.ts"

/** Canonical Convex backend per exact E2E target. Ambient VITE/localhost URLs are never consulted. */
const ticketBackendConvexUrls = {
  production: "https://eventoren-convex.contentoren.de",
  development: "https://eventoren-convex.leonardomora.de",
} as const

/**
 * Resolve the explicit invocation canonical backend pair for ticket reconciliation.
 * The E2E_BASE_URL gate stays exact per target and production ticket purchase stays
 * forbidden. A missing or foreign E2E_CLEANUP_CONVEX_URL refuses before any query.
 */
export const e2eTicketBackendResolve = (environment: Record<string, string | undefined>) => {
  const op = "e2eTicketBackendResolve"
  const read = e2eEnvironmentRead(environment)
  if (!read.success) return read
  const guard = e2eTicketTargetCheck(read.data.target)
  if (!guard.success) return guard
  const convexUrl = environment.E2E_CLEANUP_CONVEX_URL?.trim()
  if (!convexUrl) {
    return createResultError(
      op,
      "Ticket E2E requires the explicit invocation E2E_CLEANUP_CONVEX_URL for the canonical target; refusing before queries",
    )
  }
  const canonical = ticketBackendConvexUrls[read.data.target]
  if (convexUrl !== canonical) {
    return createResultError(
      op,
      `Ticket E2E backend does not match the canonical ${read.data.target} backend; refusing before queries`,
    )
  }
  return createResult({ target: read.data.target, baseUrl: read.data.baseUrl, convexUrl: canonical })
}
