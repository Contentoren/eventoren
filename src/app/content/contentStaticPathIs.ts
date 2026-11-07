import { contentCollectionConfig } from "./contentCollectionConfig.ts"

const pathBaseList = Object.values(contentCollectionConfig).map((config) => config.pathBase)

/** True for a hub (`/ratgeber`, `/en/guides`) or article path of a prerendered content collection. */
export function contentStaticPathIs(pathname: string): boolean {
  return pathBaseList.some((base) => pathname === base || pathname.startsWith(`${base}/`))
}
