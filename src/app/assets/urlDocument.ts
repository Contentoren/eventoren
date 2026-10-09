import { assetPublicUrlCreate } from "./assetPublicUrlCreate.js"
import { documentList } from "./documentList.js"
import { managedDocumentPaths } from "./managedDocumentPaths.js"

const canonicalAssetsBaseUrl = "https://assets.eventoren.de"

/** Resolve a managed public-root document to its canonical asset URL. */
export function urlDocument(sourcePath: keyof typeof managedDocumentPaths): string {
  const catalogKey = managedDocumentPaths[sourcePath]
  const document = documentList[catalogKey]
  return assetPublicUrlCreate({ publicBaseUrl: canonicalAssetsBaseUrl, r2Prefix: "production" }, document.path)
}
