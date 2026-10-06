import { ConvexClient } from "convex/browser"
import { onCleanup } from "solid-js"
import { convexUrlGet } from "#src/app/url/convexUrlGet.ts"

export function convexClientProviderStateCreate() {
  const client = typeof window === "undefined" ? undefined : new ConvexClient(convexUrlGet())
  onCleanup(() => {
    if (client) void client.close()
  })
  return { client }
}
