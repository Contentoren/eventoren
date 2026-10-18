export type ApiKeyCredential = {
  credential: string
  previewFirst3: string
  previewLast3: string
}

export function apiKeyCredentialGenerate(): ApiKeyCredential {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const credential = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

  return {
    credential,
    previewFirst3: credential.slice(0, 3),
    previewLast3: credential.slice(-3),
  }
}
