export function signInSearchParse(input: Record<string, unknown>): { readonly returnTo: string | undefined } {
  const returnTo = input.returnTo
  if (typeof returnTo !== "string" || !returnTo.startsWith("/") || returnTo.startsWith("//") || returnTo.includes("\\"))
    return { returnTo: undefined }
  return { returnTo }
}
