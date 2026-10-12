export function adminActivationCodeBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    // Revoke asynchronously so the browser can start the download first.
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
}
