import type { JSX } from "solid-js"
import { classesImgZoomInOnHover5 } from "#ui/static/img/classesImgZoomInOnHover5.js"
import { classInvertBlack } from "#ui/static/img/classInvertBlack.js"
import { classArr } from "#ui/utils/classArr.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export interface ImgProps extends MayHaveClass {
  src: string
  alt: string
  onError?: JSX.ImgHTMLAttributes<HTMLImageElement>["onError"]
  zoomIn?: boolean
  invertColorsInDarkMode?: boolean
  eager?: boolean
  fetchPriority?: "high" | "low" | "auto"
  width?: string | number
  height?: string | number
  ariaHidden?: boolean
}

/**
 * Lazy-loaded image with optional zoom and dark-mode invert. Pass eager for above-the-fold heroes.
 * Falls back to 1200x800 dimensions (32x32 for svg) so every image carries width/height for SEO and CLS.
 */
export function Img(p: ImgProps) {
  return (
    <img
      src={p.src}
      alt={p.alt}
      onError={p.onError}
      class={classArr(p.zoomIn && classesImgZoomInOnHover5, p.invertColorsInDarkMode && classInvertBlack, p.class)}
      loading={p.eager ? "eager" : "lazy"}
      decoding="async"
      aria-hidden={p.ariaHidden}
      fetchpriority={p.fetchPriority ?? (p.eager ? "high" : undefined)}
      draggable={false}
      width={p.width ?? (p.src?.endsWith(".svg") ? 32 : 1200)}
      height={p.height ?? (p.src?.endsWith(".svg") ? 32 : 800)}
    />
  )
}
