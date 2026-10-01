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
  width?: string | number
  height?: string | number
}

/** Lazy-loaded image with optional zoom and dark-mode invert. */
export function Img(p: ImgProps) {
  return (
    <img
      src={p.src}
      alt={p.alt}
      onError={p.onError}
      class={classArr(p.zoomIn && classesImgZoomInOnHover5, p.invertColorsInDarkMode && classInvertBlack, p.class)}
      loading="lazy"
      decoding="async"
      draggable={false}
      width={p.width}
      height={p.height}
    />
  )
}
