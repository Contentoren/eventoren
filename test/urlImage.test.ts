import { expect, test } from "bun:test"
import { imageList } from "../src/app/assets/imageList.ts"

const defaultBaseUrl = "https://assets-service-public.contentoren.de/eventoren/public"
const image = imageList.eventoren_logo_light2

async function urlImageLoad(production: boolean, publicBaseUrl?: string) {
  const bundle = await Bun.build({
    entrypoints: [new URL("../src/app/assets/urlImage.ts", import.meta.url).pathname],
    target: "browser",
    define: {
      "import.meta.env.PROD": JSON.stringify(production),
      "import.meta.env.VITE_ASSETS_PUBLIC_BASE_URL": JSON.stringify(publicBaseUrl) ?? "undefined",
    },
  })
  expect(bundle.success).toBe(true)
  expect(bundle.logs).toEqual([])

  const source = await bundle.outputs[0]!.text()
  const module: typeof import("../src/app/assets/urlImage.ts") = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  return module.urlImage
}

for (const prod of [false, true]) {
  const mode = prod ? "production" : "development"

  test(`managed images use the default CDN while raw paths retain ${mode} behavior`, async () => {
    const urlImage = await urlImageLoad(prod)

    expect(urlImage(image)).toBe(`${defaultBaseUrl}/${image.path}`)
    expect(urlImage({ path: `/${image.path}/` })).toBe(`${defaultBaseUrl}/${image.path}`)
    expect(urlImage(`/${image.path}/`)).toBe(`${prod ? defaultBaseUrl : ""}/${image.path}`)
  })

  test(`managed images honor the trimmed CDN override in ${mode}`, async () => {
    const urlImage = await urlImageLoad(prod, "  https://example.com/assets///  ")

    expect(urlImage(image)).toBe(`https://example.com/assets/${image.path}`)
    expect(urlImage(image.path)).toBe(`${prod ? "https://example.com/assets" : ""}/${image.path}`)
  })

  test(`blank CDN overrides fall back to the default CDN in ${mode}`, async () => {
    const urlImage = await urlImageLoad(prod, "  ")

    expect(urlImage(image)).toBe(`${defaultBaseUrl}/${image.path}`)
  })

  test(`absolute URLs remain unchanged for managed images and raw strings in ${mode}`, async () => {
    const urlImage = await urlImageLoad(prod)

    for (const path of ["https://example.com/logo.avif?version=1#logo", "data:image/png;base64,aGVsbG8="]) {
      expect(urlImage(path)).toBe(path)
      expect(urlImage({ path })).toBe(path)
    }
  })
}
