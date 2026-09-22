import { createFileRoute } from "@tanstack/solid-router"
import { DemoOrganizerEventList } from "../../demo/ui/DemoOrganizerEventList.tsx"
import { seo } from "../../lib/seo.js"

export const Route = createFileRoute("/demo/admin_/organizer")({
  head: () => ({
    meta: [
      ...seo.pageMeta({
        title: "Organizer ticket check-in demo",
        description: "Browse local organizer events and open a backend-free ticket check-in workflow.",
        path: "/demo/admin/organizer",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [seo.canonicalLink("/demo/admin/organizer")],
  }),
  component: () => <DemoOrganizerEventList empty={false} />,
})
