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

test("contract pages carry no draft labels and expose the current revisions", () => {
  const { page } = render()
  expect(page).toContain("Veranstalter-Verträge</h1>")
  expect(page).not.toContain("MUSTER")
  expect(page).not.toContain("ENTWURF")
  expect(page).not.toContain("Vertragsmuster")
  expect(page).not.toContain("anwaltlich")
  expect(page).not.toContain("Rechtsberatung")
  // Statutory form label only: "Muster-Widerrufsformular" is the legally required
  // heading for section 15, not a draft marker.
  expect(page).toContain("Muster-Widerrufsformular")
  const statutoryFormExplanation =
    "Die Bezeichnung „Muster“ in dieser gesetzlich vorgesehenen Formularvorlage bezeichnet nicht den Status des Veranstaltervertrags."
  expect(page).toContain(statutoryFormExplanation)
  expect(page.replace(statutoryFormExplanation, "").split("Muster-Widerrufsformular").join("")).not.toContain("Muster")
  expect(page).toContain("eventoren-veranstaltervertrag-2026-10-23-v2")
  expect(page).toContain("eventoren-auftragsverarbeitungsvertrag-2026-10-23-v2")
  expect(page).toContain('id="eventoren-veranstaltervertrag"')
  expect(page).toContain('id="eventoren-auftragsverarbeitungsvertrag"')
  expect(page).toContain("Ein Tarif. Keine Grundgebühr.")
})

test("reworked AVV renders all ten sections including the annex references", () => {
  const { page } = render()
  expect(page).toContain("Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (AVV)</h2>")
  expect(page).toContain("1. Parteien, Gegenstand und Rangfolge")
  expect(page).toContain("2. Zweck, Art, Umfang und Dauer")
  expect(page).toContain("3. Rollenabgrenzung und Verantwortlichkeit")
  expect(page).toContain("4. Dokumentierte Weisungen und Vertraulichkeit")
  expect(page).toContain("5. Sicherheit der Verarbeitung")
  expect(page).toContain("6. Unterauftragsverarbeiter und Drittlandübermittlungen")
  expect(page).toContain("7. Betroffenenrechte, Vorfälle und Unterstützung")
  expect(page).toContain("8. Rückgabe, Löschung und Nachweis")
  expect(page).toContain("9. Nachweise, Kontrollen und Behörden")
  expect(page).toContain("10. Freigabe, Änderungen und Fortgeltung")
  expect(page).toContain("Anlage 1")
  expect(page).toContain("Anlage 2")
  expect(page).toContain("Anlage 3")
})

test("contract documents render price card plus one card article per document with a revision notice", () => {
  const { page } = render()
  expect(page.match(/<article/g)).toHaveLength(3)
  expect(page).toContain("<dl")
  expect(page).toContain("Ein Tarif. Keine Grundgebühr.")
  expect(page).toContain("Veranstaltervertrag mit Preis- und Leistungsblatt</h2>")
  expect(page).toContain("Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (AVV)</h2>")
})

test("contract links name both documents without draft labels", () => {
  const { links } = render()
  expect(links).toContain("Veranstaltervertrag, Preisblatt und Widerrufsbelehrung lesen")
  expect(links).toContain("Auftragsverarbeitungsvertrag (AVV) einschließlich Anlagen lesen")
  expect(links).toContain("eventoren-veranstaltervertrag-2026-10-23-v2")
  expect(links).toContain("eventoren-auftragsverarbeitungsvertrag-2026-10-23-v2")
  expect(links).toContain("#eventoren-veranstaltervertrag")
  expect(links).toContain("#eventoren-auftragsverarbeitungsvertrag")
  expect(links).not.toContain("MUSTER")
  expect(links).not.toContain("Muster")
})
