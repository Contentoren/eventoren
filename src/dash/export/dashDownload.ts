export function dashDownload(fileName: string, data: string | Uint8Array, mimeType: string): void {
  if (typeof document === "undefined") return
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: mimeType })
      : new Blob([data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer], {
          type: mimeType,
        })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
