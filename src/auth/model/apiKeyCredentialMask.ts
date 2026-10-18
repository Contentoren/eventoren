export function apiKeyCredentialMask(previewFirst3: string, previewLast3: string): string {
  return `${previewFirst3}••••••${previewLast3}`
}
