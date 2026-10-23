import { cn } from "cn"
import type { MayHaveChildren } from "#ui/utils/MayHaveChildren.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export interface KbdProps extends MayHaveChildren, MayHaveClass {}

/** Keyboard shortcut hint styled like a physical key. */
export function Kbd(p: KbdProps) {
  return (
    <kbd
      class={cn(
        "inline-flex min-w-6 items-center justify-center rounded-md border border-border-subtle bg-surface px-1.5 py-0.5 font-sans text-xs font-medium text-content-muted shadow-[0_1px_0_var(--color-border-subtle)]",
        p.class,
      )}
    >
      {p.children}
    </kbd>
  )
}
