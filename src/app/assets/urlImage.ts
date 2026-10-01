import type { CatalogImage } from "@adaptive-ds/assets-service"

const publicBaseUrl =
  import.meta.env.VITE_ASSETS_PUBLIC_BASE_URL?.trim() || "https://assets-service-public.contentoren.de/eventoren/public"

type ManagedImagePath = Pick<CatalogImage, "path"> | string

/** Resolve an assets-service catalog image or fallback path for the current build environment. */
export function urlImage(image: ManagedImagePath): string {
  const imagePath = typeof image === "string" ? image : image.path
  if (URL.canParse(imagePath)) return imagePath

  const objectKey = imagePath.replace(/^\/+|\/+$/gu, "")
  if (typeof image === "string" && !import.meta.env.PROD) return "/" + objectKey
  return new URL(objectKey, publicBaseUrl.replace(/\/+$/u, "") + "/").toString()
}
