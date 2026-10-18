import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AvatarShape, AvatarSize } from "#ui/static/avatar/Avatar.jsx"

/** Avatar view state: image visibility with fallback to initials when loading fails. */
export function avatarStateCreate(input: {
  src: () => string | null | undefined
  size: () => AvatarSize
  shape: () => AvatarShape
}) {
  const failed = createSignalObject(false)

  createEffect(() => {
    input.src()
    failed.set(false)
  })

  const showImage = () => (input.src()?.length ?? 0) > 0 && !failed.get()
  const markFailed = () => failed.set(true)
  const sizeKey = () => input.size()
  const shapeClass = () => (input.shape() === "circle" ? "rounded-full" : "rounded-lg")

  return { showImage, markFailed, sizeKey, shapeClass }
}
