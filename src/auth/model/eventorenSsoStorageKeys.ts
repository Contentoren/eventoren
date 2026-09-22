/** Storage keys for eventoren automatic sign-in preference and bounded attempt tracking. */
export const eventorenSsoStorageKeys = {
  preference: "eventoren:ui:auth:auto-sign-in",
  attempts: "eventoren:ui:auth:auto-sign-in-attempts",
} as const
