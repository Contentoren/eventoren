import { beforeAll, expect, test } from "bun:test"
import { createRequire } from "node:module"
import type { EventItem } from "../src/events/EventItem.ts"
import { eventImagePlaceholder } from "../src/events/eventImagePlaceholder.ts"

const require = createRequire(import.meta.url)
// Use the existing vite-plugin-solid Babel toolchain, offline: no server or global module mocks.
const { transformSync } = require("@babel/core")
const solidPreset = require("babel-preset-solid")
let render: typeof import("./eventImageViewsRender.fixture.ts").eventImageViewsRender

beforeAll(async () => {
  const bundle = await Bun.build({
    entrypoints: [new URL("./eventImageViewsRender.fixture.ts", import.meta.url).pathname],
    target: "bun",
    define: { "import.meta.env": JSON.stringify({ PROD: false, SSR: true }) },
    plugins: [
      {
        name: "solid-ssr-test",
        setup(build) {
          // Navigation is outside this rendering regression; retain the real image components.
          build.onResolve({ filter: /^@tanstack\/solid-router$/ }, () => ({ path: "router", namespace: "test-router" }))
          build.onLoad({ filter: /.*/, namespace: "test-router" }, () => ({
            contents: "export function Link(props) { return props.children }",
            loader: "js",
          }))
          build.onLoad({ filter: /\.tsx$/ }, async ({ path }) => ({
            contents: transformSync(await Bun.file(path).text(), {
              filename: path,
              presets: [[solidPreset, { generate: "ssr", hydratable: true }]],
              parserOpts: { plugins: ["jsx", "typescript"] },
              babelrc: false,
              configFile: false,
            }).code,
            loader: "tsx",
          }))
        },
      },
    ],
  })
  expect(bundle.success).toBe(true)
  expect(bundle.logs).toEqual([])
  const source = await bundle.outputs[0]!.text()
  const module: typeof import("./eventImageViewsRender.fixture.ts") = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  render = module.eventImageViewsRender
})

const pilates: EventItem = {
  id: "pilates-christmas-event-2027-final",
  catalogVersion: 1,
  title: "Pilates Christmas Event",
  subtitle: "",
  description: "Pilates",
  category: "sport",
  startsAt: "2027-12-01T18:00:00.000Z",
  endsAt: "2027-12-01T20:00:00.000Z",
  doorsAt: "2027-12-01T17:00:00.000Z",
  venue: "Studio",
  city: "Bonn",
  address: "",
  organizer: "Pilates organizer",
  imageUrl: "https://example.com/administrator-image.webp",
  imageAlt: "Administrator Pilates description",
  tags: [],
  soldOut: false,
  tiers: [],
}

function imageExpect(markup: string, src: string, alt: string) {
  const images = markup.match(/<img\b[^>]*>/g) ?? []
  expect(images.some((image) => image.includes(`src="${src}"`) && image.includes(`alt="${alt}"`))).toBe(true)
  expect(markup).not.toContain("images/pilates/")
}

test("the Pilates slug uses the saved manual image and alt text on cards, details and both cart links", () => {
  for (const markup of Object.values(render(pilates))) imageExpect(markup, pilates.imageUrl, pilates.imageAlt)
})

test("the Pilates slug uses saved card and detail variants without replacing saved alt text", () => {
  const imageVariants = {
    assetId: "administrator-upload",
    card: "https://example.com/administrator-card.avif",
    detail: "https://example.com/administrator-detail.avif",
    organizer: "https://example.com/administrator-organizer.avif",
  }
  const views = render({ ...pilates, imageVariants })
  imageExpect(views.card, imageVariants.card, pilates.imageAlt)
  imageExpect(views.detail, imageVariants.detail, pilates.imageAlt)
  imageExpect(views.bagHref, imageVariants.card, pilates.imageAlt)
  imageExpect(views.bagRoute, imageVariants.card, pilates.imageAlt)
})

test("the Pilates slug with no saved image uses the shared placeholder in every public view", () => {
  for (const markup of Object.values(render({ ...pilates, imageUrl: " \t" }))) {
    imageExpect(markup, eventImagePlaceholder, pilates.imageAlt)
  }
})
