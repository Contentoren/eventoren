import type { JSX } from "solid-js"
import { classMerge } from "./classMerge.ts"

const variantClass = {
  primary: "bg-brand text-brand-content hover:bg-brand-strong",
  secondary:
    "bg-surface-muted text-content ring-1 ring-inset ring-border-strong hover:bg-surface hover:ring-brand-accent/60",
  ghost: "bg-transparent text-content-muted hover:bg-surface-muted hover:text-content",
  /* Bright danger fill needs dark ink to stay readable. */
  danger: "bg-danger text-surface-base hover:brightness-110",
} as const

const sizeClass = {
  sm: "h-9 px-space-4 text-sm gap-space-2",
  md: "h-11 px-space-6 text-sm gap-space-3",
  lg: "h-13 px-space-7 text-base gap-space-3",
} as const

export function UiButton(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof variantClass
    size?: keyof typeof sizeClass
    block?: boolean
  },
) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      /* Disabled state is opacity-70, not -50: on a near-black backdrop a
         faded fill loses far more perceived contrast than it does on white. */
      class={classMerge(
        "focus-ring inline-flex items-center justify-center rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        variantClass[props.variant ?? "primary"],
        sizeClass[props.size ?? "md"],
        props.block && "w-full",
        props.class,
      )}
    >
      {props.children}
    </button>
  )
}
