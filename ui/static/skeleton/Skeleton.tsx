import { cn } from "cn"
import type { ComponentProps } from "solid-js"
import { splitProps } from "solid-js"

export interface SkeletonProps extends ComponentProps<"div"> {}

/** Pulsing loading placeholder that respects reduced motion. */
export function Skeleton(p: SkeletonProps) {
  const [s, rest] = splitProps(p, ["class", "aria-hidden"])
  return (
    <div
      aria-hidden={s["aria-hidden"] ?? true}
      class={cn("animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none", s.class)}
      {...rest}
    />
  )
}
