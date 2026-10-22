import { renderToString } from "solid-js/web"
import { AdminEventDetailPage } from "../src/admin/AdminEventDetailPage.tsx"

export type AdminEventDetailPageScenario = "resolving" | "missing" | "failed"

export function adminEventDetailPageRender(scenario: AdminEventDetailPageScenario) {
  const state = {
    event: () => undefined,
    eventKey: () => "missing",
    tab: () => "details" as const,
    isResolving: () => scenario === "resolving",
    notFound: () => scenario === "missing",
    loadError: () => (scenario === "failed" ? "Admin-Veranstaltungen werden geladen." : ""),
    catalog: {},
  }
  return renderToString(() => AdminEventDetailPage({ state: state as never }))
}
