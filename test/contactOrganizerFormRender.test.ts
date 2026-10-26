import { beforeAll, expect, test } from "bun:test"
import { createRequire } from "node:module"

// Use the existing vite-plugin-solid Babel toolchain, offline: no server or global module mocks.
const viteSolidRequire = createRequire(import.meta.resolveSync("vite-plugin-solid"))
const { transformSync } = viteSolidRequire("@babel/core")
const solidPreset = viteSolidRequire("babel-preset-solid")
let render: typeof import("./contactOrganizerFormRender.fixture.ts").contactOrganizerFormRender

beforeAll(async () => {
  const bundle = await Bun.build({
    entrypoints: [new URL("./contactOrganizerFormRender.fixture.ts", import.meta.url).pathname],
    target: "bun",
    // The server builds of solid-js/solid-js/web provide the SSR renderer without a DOM.
    conditions: ["bun", "worker", "import", "default"],
    define: { "import.meta.env": JSON.stringify({ PROD: false, SSR: true }) },
    plugins: [
      {
        name: "solid-ssr-test",
        setup(build) {
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
  const module: typeof import("./contactOrganizerFormRender.fixture.ts") = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  render = module.contactOrganizerFormRender
})

test("the contact form states that the online form is unavailable and that nothing is sent or stored", () => {
  const markup = render("veranstalter")

  expect(markup).toContain("Das Online-Formular ist derzeit nicht verfügbar")
  expect(markup).toContain("Online-Versand derzeit deaktiviert")
  expect(markup).toContain("wird derzeit nicht übermittelt und speichert nichts")
})

test("the contact form no longer shows a received-message success state", () => {
  const markup = render("veranstalter")

  expect(markup).not.toContain("Wir haben deine Nachricht erhalten")
  expect(markup).not.toContain("Vielen Dank für deine Anfrage")
  expect(markup).not.toContain("erhalten")
  // No submit button can claim a delivery that does not happen.
  expect(markup).not.toContain('type="submit"')
  expect(markup).not.toContain("Anfrage absenden")
  expect(markup).not.toContain("Wird gesendet")
})

test("the organizer tab opens the mail client with the published partner address", () => {
  const markup = render("veranstalter")

  expect(markup).toContain('href="mailto:partner@eventoren.de"')
  expect(markup).toContain("E-Mail an partner@eventoren.de")
  expect(markup).not.toContain("mailto:support@eventoren.de")
})

test("the support tab opens the mail client with the published support address", () => {
  const markup = render("support")

  expect(markup).toContain('href="mailto:support@eventoren.de"')
  expect(markup).toContain("E-Mail an support@eventoren.de")
  expect(markup).not.toContain("mailto:partner@eventoren.de")
})
