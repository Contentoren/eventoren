type AdminMediaPublicBinding = {
  readonly publicBaseUrl: string
  readonly r2Prefix?: string
}

/**
 * Compose the canonical public-output URL for a logical output key.
 * The R2 object key is always `{prefix}/public/{key}`; an empty prefix
 * yields `/public/{key}`. A base URL whose path already ends in the storage
 * namespace, or a key that already carries it, is not duplicated, so both
 * bare canonical bases and bases that embed `/public` compose exactly once.
 * Mirrors the Assets Service canonical formatter. Pure browser-safe helper
 * shared by admin and public consumers.
 */
export function assetPublicUrlCreate(binding: AdminMediaPublicBinding, objectKey: string): string {
  const prefix = (binding.r2Prefix ?? "").replace(/^\/+|\/+$/gu, "")
  const namespace = prefix.length > 0 ? `${prefix}/public` : "public"
  const namespacedPrefix = `${namespace}/`
  let key = objectKey.replace(/^\/+/u, "")
  if (key === namespace) key = ""
  else if (key.startsWith(namespacedPrefix)) key = key.slice(namespacedPrefix.length)
  const fullKey = key.length > 0 ? `${namespace}/${key}` : namespace
  const base = binding.publicBaseUrl.replace(/\/+$/u, "")
  try {
    const url = new URL(base)
    const basePath = url.pathname.replace(/\/+$/u, "")
    if (basePath === `/${namespace}`) return `${url.origin}/${fullKey}`
    if (prefix.length > 0 && basePath === `/${prefix}`) return `${url.origin}/${fullKey}`
    return `${base}/${fullKey}`
  } catch {
    return `${base}/${fullKey}`
  }
}
