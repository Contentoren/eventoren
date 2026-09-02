export function themeApply(_mode?: "light" | "dark") {
  if (typeof document === "undefined") return

  const root = document.documentElement
  root.classList.remove("dark")
  root.classList.add("light")
  root.dataset.theme = "light"
  root.style.colorScheme = "light"

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f8fafc")
}
