import type { ContentEntry } from "./contentList.js"
import type { CatalogImage } from "@adaptive-ds/assets-service"
import { imageList } from "../assets/imageList.js"
import { urlImage } from "../assets/urlImage.js"

export type ContentImageData = {
  readonly src: string
  readonly alt: string
  readonly width?: number
  readonly height?: number
}

type ContentImageEntry = Pick<ContentEntry, "imagePath"> & Partial<Pick<ContentEntry, "image" | "imageAlt" | "title">>

function contentCatalogImageRead(imageKey: string | null | undefined): CatalogImage | undefined {
  if (imageKey === undefined || imageKey === null) return undefined

  const normalizedKey = imageKey.replace(/[\\/-]/gu, "_")
  const catalogImages = imageList as unknown as Readonly<Record<string, CatalogImage>>
  const directImage = catalogImages[imageKey] ?? catalogImages[normalizedKey]
  if (directImage !== undefined) return directImage

  const imageBasename = imageKey.replace(/\.[^.]+$/u, "")
  return Object.values(catalogImages).find(
    (image) => image.basename === imageKey || image.basename === normalizedKey || image.basename === imageBasename,
  )
}

export function contentImageRead(entry: ContentImageEntry): ContentImageData | undefined {
  const catalogImage = contentCatalogImageRead(entry.image)
  if (catalogImage !== undefined) {
    return {
      src: urlImage(catalogImage),
      alt: catalogImage.metadata.alt ?? entry.imageAlt ?? entry.title ?? "",
      width: catalogImage.metadata.width,
      height: catalogImage.metadata.height,
    }
  }
  if (entry.imagePath === null || entry.imagePath === undefined) return undefined
  const imagePath = entry.imagePath
  return {
    src: urlImage(imagePath),
    alt: entry.imageAlt ?? entry.title ?? "",
  }
}

export function getContentImageUrl(entry: ContentImageEntry): string | undefined {
  return contentImageRead(entry)?.src
}

export function getAbsoluteContentImageUrl(entry: ContentImageEntry, siteUrl: string): string | undefined {
  const imageUrl = getContentImageUrl(entry)
  if (imageUrl === undefined) return undefined
  return new URL(imageUrl, siteUrl).toString()
}
