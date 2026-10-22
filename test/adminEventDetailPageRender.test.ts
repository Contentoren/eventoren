import { beforeAll, expect, test } from "bun:test"
import { createRequire } from "node:module"
import type { adminEventDetailPageRender } from "./adminEventDetailPageRender.fixture.ts"

const require = createRequire(import.meta.url)
// Use the existing vite-plugin-solid Babel toolchain, offline: no server or global module mocks.
const viteSolidRequire = createRequire(import.meta.resolveSync("vite-plugin-solid"))
const { transformSync } = viteSolidRequire("@babel/core")
const solidPreset = viteSolidRequire("babel-preset-solid")
let render: typeof adminEventDetailPageRender

beforeAll(async () => {
  const bundle = await Bun.build({
    entrypoints: [new URL("./adminEventDetailPageRender.fixture.ts", import.meta.url).pathname],
    target: "bun",
    define: { "import.meta.env": JSON.stringify({ PROD: false, SSR: true }) },
    plugins: [
      {
        name: "solid-ssr-test",
        setup(build) {
          // Navigation and PDF export are outside this rendering regression; retain the real detail page.
          build.onResolve({ filter: /^@tanstack\/solid-router$/ }, () => ({ path: "router", namespace: "test-router" }))
          build.onLoad({ filter: /.*/, namespace: "test-router" }, () => ({
            contents: "export function Link(props) { return props.children }",
            loader: "js",
          }))
          build.onResolve({ filter: /^jspdf$/ }, () => ({ path: "jspdf", namespace: "test-jspdf" }))
          build.onLoad({ filter: /.*/, namespace: "test-jspdf" }, () => ({
            contents: "export class jsPDF { text() {} save() {} }",
            loader: "js",
          }))
          // The event branch children pull client-only dialog/popover bundles that cannot
          // evaluate under SSR. They never render in the tested no-event branches, so stub
          // them and keep the real gating component with its real fallback UI.
          const stubbed: Record<string, string> = {
            AdminActivationCodesPanel: "AdminActivationCodesPanel",
            AdminEventDetailHeader: "AdminEventDetailHeader",
            AdminEventDetailsForm: "AdminEventDetailsForm",
            AdminEventFeedback: "AdminEventFeedback",
            AdminEventReleaseForm: "AdminEventReleaseForm",
            AdminEventTabs: "AdminEventTabs",
            AdminTicketProductsForm: "AdminTicketProductsForm",
          }
          build.onResolve(
            {
              filter:
                /Admin(ActivationCodesPanel|EventDetailHeader|EventDetailsForm|EventFeedback|EventReleaseForm|EventTabs|TicketProductsForm)/,
            },
            (args) => ({ path: args.path, namespace: "test-stub" }),
          )
          build.onLoad({ filter: /.*/, namespace: "test-stub" }, (args) => {
            const name = Object.values(stubbed).find((entry) => args.path.includes(entry)) ?? "StubbedAdminChild"
            return { contents: `export function ${name}() { return null }`, loader: "js" }
          })
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
  const module: typeof import("./adminEventDetailPageRender.fixture.ts") = await import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  )
  render = module.adminEventDetailPageRender
})

test("a resolving admin event detail shows loading instead of the missing card", () => {
  const markup = render("resolving")
  expect(markup).toContain("Event wird geladen")
  expect(markup).not.toContain("Event nicht gefunden")
  expect(markup).not.toContain("Event konnte nicht geladen werden")
})

test("a confirmed-missing admin event detail shows the missing card only", () => {
  const markup = render("missing")
  expect(markup).toContain("Event nicht gefunden")
  expect(markup).not.toContain("Event wird geladen")
  expect(markup).not.toContain("Event konnte nicht geladen werden")
})

test("a failed admin event detail surfaces the load error instead of the missing card", () => {
  const markup = render("failed")
  expect(markup).toContain("Event konnte nicht geladen werden")
  expect(markup).toContain("Admin-Veranstaltungen werden geladen.")
  expect(markup).not.toContain("Event nicht gefunden")
  expect(markup).not.toContain("Event wird geladen")
})
