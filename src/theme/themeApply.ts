export function themeApply(mode: "light" | "dark") {
  if (typeof document === "undefined") return

  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(mode)
  root.dataset.theme = mode
  root.style.colorScheme = mode

  const themeColor = mode === "dark" ? "#020617" : "#f8fafc"
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor)
}
