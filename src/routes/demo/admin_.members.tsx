import { createFileRoute } from "@tanstack/solid-router"
import { DemoAdminMembers } from "../../demo/ui/DemoAdminMembers.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin_/members")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Admin-Mitgliederverwaltung-Demo",
        description: "Lokale Eventoren-Demo zur Verwaltung von Mitgliedern und Rollen ohne Backend-Aufrufe.",
        path: "/demo/admin/members",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/members")],
  }),
  component: DemoAdminMembers,
})
