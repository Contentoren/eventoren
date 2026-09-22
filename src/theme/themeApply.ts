export function themeApply(mode: "light" | "dark" = "light") {
  if (typeof document === "undefined") return

  const root = document.documentElement
  const isDark = mode === "dark"
  root.classList.toggle("dark", isDark)
  root.classList.toggle("light", !isDark)
  root.dataset.theme = mode
  root.style.colorScheme = mode

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#020617" : "#f8fafc")
}
