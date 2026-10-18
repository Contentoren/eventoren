export type DonutTone = "brand" | "accent" | "success" | "warning" | "danger" | "info" | "neutral"

/** Stroke/fill tone classes for donut segments and legend dots (currentColor-based, readable in light and dark). */
export const donutToneClass: Record<DonutTone, string> = {
  brand: "text-brand",
  accent: "text-accent dark:text-amber-400",
  success: "text-success dark:text-emerald-400",
  warning: "text-warning dark:text-amber-400",
  danger: "text-danger dark:text-red-400",
  info: "text-sky-600 dark:text-sky-400",
  neutral: "text-slate-400",
}
