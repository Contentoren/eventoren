export function copyFallback(value: string) {
  const area = document.createElement("textarea")
  area.value = value
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.appendChild(area)
  area.select()
  try {
    document.execCommand("copy")
  } catch {
    // Clipboard fallback unsupported; value stays selectable in nothing else to do.
  }
  document.body.removeChild(area)
}
