export function authSecretRead(value: string | undefined): string | undefined {
  const secret = value?.trim()
  if (!secret || secret.startsWith("replace-with-")) return undefined
  return secret
}
