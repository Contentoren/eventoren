export function signInEnterOtpSearchParse(input: Record<string, unknown>): {
  readonly email: string | undefined
  readonly code: string | undefined
  readonly returnTo: string | undefined
} {
  return {
    email: stringRead(input.email),
    code: stringRead(input.code),
    returnTo: safeReturnTo(stringRead(input.returnTo) ?? stringRead(input.returnPath)),
  }
}

function stringRead(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function safeReturnTo(value: string | undefined): string | undefined {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return undefined
  return value
}
