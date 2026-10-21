export async function organizerContractTextDigestCreate(canonicalText: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalText))
  const hex = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `sha256:${hex}`
}
