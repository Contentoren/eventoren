import { cn } from "cn"
import type { FilterChipTone } from "#ui/interactive/chip/FilterChip.jsx"

const activeToneClass: Record<FilterChipTone, string> = {
  neutral: "border-brand bg-brand-soft text-brand-accent",
  danger: "border-danger bg-danger-soft text-danger dark:border-red-400 dark:bg-red-950/40 dark:text-red-300",
  warning: "border-warning bg-warning-soft text-warning dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300",
}

const activeBadgeClass: Record<FilterChipTone, string> = {
  neutral: "bg-brand text-brand-content",
  danger: "bg-danger text-white",
  warning: "bg-warning text-white",
}

export function filterChipStateCreate(input: { active: () => boolean; tone: () => FilterChipTone }) {
  const chipClass = (extra?: string) =>
    cn(
      "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-ring",
      input.active()
        ? activeToneClass[input.tone()]
        : "border-border-subtle bg-surface text-content-muted hover:border-brand hover:text-content",
      extra,
    )

  const badgeClass = () =>
    cn(
      "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
      input.active() ? activeBadgeClass[input.tone()] : "bg-surface-muted text-content-muted",
    )

  return { chipClass, badgeClass }
}
