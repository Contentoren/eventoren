import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/** Collection of a source path such as `content/guides/2026-11-06-x.md`; undefined outside both dirs. */
export function contentCollectionFromPath(path: string): ContentCollection | undefined {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//u, "")
  for (const config of Object.values(contentCollectionConfig)) {
    const prefix = `${config.dir}/`
    if (normalized.startsWith(prefix) || normalized.includes(`/${prefix}`)) return config.collection
  }
  return undefined
}
