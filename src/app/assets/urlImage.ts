import type { CatalogImage } from "@adaptive-ds/assets-service"
import { assetPublicUrlCreate } from "./assetPublicUrlCreate.js"

const configuredBaseUrl = import.meta.env.VITE_ASSETS_PUBLIC_BASE_URL?.trim() ?? ""
const canonicalAssetsBaseUrl = "https://assets.eventoren.de"

type ManagedImagePath = Pick<CatalogImage, "path"> | string

/** Resolve an assets-service catalog image to its canonical managed URL in every build mode. */
export function urlImage(image: ManagedImagePath): string {
  const imagePath = typeof image === "string" ? image : image.path
  if (URL.canParse(imagePath)) return imagePath

  const objectKey = imagePath.replace(/^\/+|\/+$/gu, "")
  const publicBaseUrl = configuredBaseUrl.length > 0 ? configuredBaseUrl : canonicalAssetsBaseUrl
  return assetPublicUrlCreate({ publicBaseUrl, r2Prefix: "production" }, objectKey)
}
