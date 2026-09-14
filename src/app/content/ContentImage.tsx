import type { JSX } from "solid-js"
import { contentImageRead } from "./contentImages.js"
import type { ContentEntry } from "./contentList.js"

type ContentImageProps = Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  readonly entry: ContentEntry
  readonly fallbackAlt?: string
  readonly isHero?: boolean
}

export function ContentImage(props: ContentImageProps) {
  const image = contentImageRead({
    ...props.entry,
    imageAlt: props.entry.imageAlt ?? props.fallbackAlt,
  })
  if (image === undefined) return null

  const { entry: _entry, fallbackAlt: _fallbackAlt, isHero = false, ...rest } = props
  const imageProps = rest
  return (
    <img
      {...imageProps}
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      loading={isHero ? "eager" : (imageProps.loading ?? "lazy")}
      decoding={imageProps.decoding ?? "async"}
      {...(isHero ? { fetchpriority: "high" as const } : {})}
    />
  )
}
