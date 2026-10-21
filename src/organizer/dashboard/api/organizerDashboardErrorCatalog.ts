import type { ResultErrorHttpStatus } from "#shared/resultErrorHttpStatus.js"

/**
 * Explicit error catalog for the organizer dashboard interface layer.
 * Codes and HTTP statuses are fixed here; nothing in this layer derives a
 * code or status from an error message. Backend Result rejections carry no
 * code today, so they fall back to platform.internal/500 until typed backend
 * error codes land (known limitation, reported to the caller).
 */
export const organizerDashboardErrorCatalog = {
  "organizer-dashboard.invalid-body": { httpStatus: 400, retryable: false },
  "organizer-dashboard.unauthenticated": { httpStatus: 401, retryable: false },
  "organizer-dashboard.unknown-operation": { httpStatus: 404, retryable: false },
  "organizer-dashboard.transport-unavailable": { httpStatus: 503, retryable: true },
  "platform.internal": { httpStatus: 500, retryable: false },
} as const satisfies Record<string, { readonly httpStatus: ResultErrorHttpStatus; readonly retryable: boolean }>
