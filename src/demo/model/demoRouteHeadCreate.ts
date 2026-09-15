import { seo } from "../../lib/seo.js"

export function demoRouteHeadCreate(title: string, description: string, path: string) {
  return {
    meta: [...seo.pageMeta({ title, description, path }), { name: "robots", content: "noindex, nofollow" }],
    links: [seo.canonicalLink(path)],
  }
}
