import { seoJsonLdSerialize } from "./seoJsonLdSerialize.ts"

/** One `application/ld+json` script holding a schema.org `@graph` of linked nodes. */
export function seoJsonLdGraphScriptCreate(nodes: readonly Record<string, unknown>[]): {
  type: string
  children: string
} {
  return {
    type: "application/ld+json",
    children: seoJsonLdSerialize({ "@context": "https://schema.org", "@graph": nodes }),
  }
}
