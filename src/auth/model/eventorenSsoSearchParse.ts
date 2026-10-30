export function eventorenSsoSearchParse(input: Record<string, unknown>): {
  readonly returnTo: string | undefined
  readonly ssoError: string | undefined
} {
  const returnTo = input.returnTo
  const ssoError = input.ssoError
  return {
    returnTo:
      typeof returnTo !== "string" || !returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\")
        ? undefined
        : returnTo,
    ssoError: typeof ssoError === "string" && ssoError.length > 0 ? ssoError : undefined,
  }
}
