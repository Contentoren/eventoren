import { Show } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import { avatarInitialsGet } from "./avatarInitialsGet.js"
import { avatarPaletteResolve } from "./avatarPaletteResolve.js"
import { avatarStateCreate } from "./avatarStateCreate.js"

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"
export type AvatarShape = "circle" | "rounded"

export interface AvatarProps extends MayHaveClass {
  name: string
  src?: string | null
  size?: AvatarSize
  shape?: AvatarShape
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-xl",
}

/** Avatar with the initials of a name, or an image when `src` loads (falls back to initials on error). */
export function Avatar(p: AvatarProps) {
  const state = avatarStateCreate({
    src: () => p.src,
    size: () => p.size ?? "md",
    shape: () => p.shape ?? "circle",
  })
  return (
    <Show
      when={state.showImage()}
      fallback={
        <span
          role="img"
          aria-label={p.name}
          class={classMerge(
            "inline-flex shrink-0 items-center justify-center font-semibold select-none",
            state.shapeClass(),
            sizeClasses[state.sizeKey()],
            avatarPaletteResolve(p.name),
            p.class,
          )}
        >
          {avatarInitialsGet(p.name)}
        </span>
      }
    >
      <img
        src={p.src ?? ""}
        alt={p.name}
        loading="lazy"
        onError={() => state.markFailed()}
        class={classMerge("shrink-0 object-cover", state.shapeClass(), sizeClasses[state.sizeKey()], p.class)}
      />
    </Show>
  )
}
