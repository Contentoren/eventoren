import { beforeAll, expect, test } from "bun:test"
import { createRequire } from "node:module"
import type { organizerContractDocumentsRender } from "./organizerContractDocumentsRender.fixture.ts"

const require = createRequire(import.meta.url)
// Use the existing vite-plugin-solid Babel toolchain, offline: no server or browser globals.
const viteSolidRequire = createRequire(import.meta.resolveSync("vite-plugin-solid"))
const { transformSync } = viteSolidRequire("@babel/core")
const solidPreset = viteSolidRequire("babel-preset-solid")
let render: typeof organizerContractDocumentsRender

beforeAll(async () => {
  const bundle = await Bun.build({
    entrypoints: [new URL("./organizerContractDocumentsRender.fixture.ts", import.meta.url).pathname],
    target: "bun",
    define: { "import.meta.env": JSON.stringify({ PROD: false, SSR: true }) },
    plugins: [
      {
        name: "solid-ssr-test",
        setup(build) {
          // LinkButtonInternal binds createLink at module load; the contract links under test
          // render only the plain-anchor LinkButtonExternal, so a minimal stub is sufficient.
          build.onResolve({ filter: /^@tanstack\/solid-router$/ }, () => ({ path: "router", namespace: "test-router" }))
          build.onLoad({ filter: /.*/, namespace: "test-router" }, () => ({
            contents: "export function createLink() { return () => null }",
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
  const module: typeof import("./organizerContractDocumentsRender.fixture.ts") = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  render = module.organizerContractDocumentsRender
})

test("contract pages carry no MUSTER labels and expose the current revisions", () => {
  const { page } = render()
  expect(page).toContain("Veranstalter-Verträge</h1>")
  expect(page).not.toContain("MUSTER")
  expect(page).not.toContain("Muster")
  expect(page).not.toContain("ENTWURF")
  expect(page).not.toContain("Vertragsmuster")
  expect(page).toContain("eventoren-veranstalter-agb-2026-10-23-v1")
  expect(page).toContain("eventoren-veranstalter-avv-2026-10-23-v1")
  expect(page).toContain('id="eventoren-veranstalter-agb"')
  expect(page).toContain('id="eventoren-veranstalter-avv"')
})

test("reworked AVV renders all ten sections including the TOM annexes", () => {
  const { page } = render()
  expect(page).toContain("Auftragsverarbeitungsvereinbarung (AVV)</h2>")
  expect(page).toContain("Anlage 1")
  expect(page).toContain("Anlage 2")
  expect(page).toContain("Anlage 3")
  expect(page).toContain("Europe/Berlin")
})

test("contract documents render one card article per document with a revision notice", () => {
  const { page } = render()
  expect(page.match(/<article/g)).toHaveLength(2)
  expect(page).toContain("<dl")
})

test("contract links name both documents without MUSTER labels", () => {
  const { links } = render()
  expect(links).toContain("Veranstalter-AGB lesen")
  expect(links).toContain("AVV lesen")
  expect(links).not.toContain("MUSTER")
  expect(links).not.toContain("Muster")
})
