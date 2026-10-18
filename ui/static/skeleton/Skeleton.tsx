import type { ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

export interface SkeletonProps extends ComponentProps<"div"> {}

/** Pulsing loading placeholder that respects reduced motion. */
export function Skeleton(p: SkeletonProps) {
  const [s, rest] = splitProps(p, ["class", "aria-hidden"])
  return (
    <div
      aria-hidden={s["aria-hidden"] ?? true}
      class={classMerge("animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none", s.class)}
      {...rest}
    />
  )
}
