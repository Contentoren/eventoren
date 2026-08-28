import type { JSX } from "solid-js"

/* Deep tinted chip + its own bright ink, so badges glow against dark cards
   while every pair clears WCAG AA (most clear AAA). Rings are lifted to /50
   to keep a visible contour on near-black surfaces. */
const toneClass = {
  neutral: "bg-surface-muted text-content ring-border-strong",
  brand: "bg-brand-soft text-brand-accent ring-brand-accent/50",
  success: "bg-success-soft text-success ring-success/50",
  warning: "bg-warning-soft text-warning ring-warning/50",
  danger: "bg-danger-soft text-danger ring-danger/50",
} as const

export function UiBadge(props: { children: JSX.Element; tone?: keyof typeof toneClass; class?: string }) {
  return (
    <span
      class={`inline-flex items-center gap-space-1 rounded-full px-space-4 py-space-1 text-xs font-medium ring-1 ring-inset ${
        toneClass[props.tone ?? "neutral"]
      } ${props.class ?? ""}`}
    >
      {props.children}
    </span>
  )
}
