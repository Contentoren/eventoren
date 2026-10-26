import { expect, test } from "bun:test"
import viteConfig from "../vite.config.ts"

const devNoindexHeaderName = "X-Robots-Tag"
const devNoindexPluginName = "eventoren:dev-noindex-headers"

type DevResponseLike = {
  setHeader: (name: string, value: string) => void
}

type DevMiddlewareHandler = (request: unknown, response: DevResponseLike, next: () => void) => void

type DevServerLike = {
  middlewares: {
    use: (handler: DevMiddlewareHandler) => void
  }
}

type VitePluginLike = {
  name?: string
  configureServer?: (server: DevServerLike) => void
  configurePreviewServer?: (server: DevServerLike) => void
}

function vitePluginFind(name: string): VitePluginLike | undefined {
  const plugins = (viteConfig.plugins ?? []) as unknown as VitePluginLike[]
  return plugins.find((plugin) => plugin?.name === name)
}

test("marks the dev server responses as noindex", () => {
  expect(viteConfig.server?.headers?.[devNoindexHeaderName]).toBe("noindex")
})

test("sets the noindex header on every dev server response, including the framework SSR responses", () => {
  const plugin = vitePluginFind(devNoindexPluginName)
  expect(plugin).toBeDefined()

  let handler: DevMiddlewareHandler | undefined
  const server: DevServerLike = {
    middlewares: {
      use: (registered) => {
        handler = registered
      },
    },
  }
  plugin?.configureServer?.(server)
  expect(handler).toBeDefined()

  const headers: Record<string, string> = {}
  let nextCalled = false
  handler?.(
    undefined,
    {
      setHeader: (name, value) => {
        headers[name] = value
      },
    },
    () => {
      nextCalled = true
    },
  )

  expect(headers[devNoindexHeaderName]).toBe("noindex")
  expect(nextCalled).toBe(true)
})

test("leaves the production build and its preview server without the noindex header", () => {
  const plugin = vitePluginFind(devNoindexPluginName)
  expect(plugin?.configurePreviewServer).toBeUndefined()
  expect(viteConfig.preview?.headers?.[devNoindexHeaderName]).toBeUndefined()
})
