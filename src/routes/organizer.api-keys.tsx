import { createFileRoute, redirect } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { EventorenApiKeysPage } from "#src/auth/ui/api_keys/EventorenApiKeysPage.tsx"
import { eventorenOrganizerAccessRead } from "#src/auth/server/eventorenOrganizerAccessRead.ts"
import { OrganizerShell } from "#src/organizer/OrganizerShell.tsx"
import { seoHeadCreate } from "#src/seo/seoHeadCreate.ts"

const getOrganizerAccess = createServerFn({ method: "GET" }).handler(eventorenOrganizerAccessRead)

export const Route = createFileRoute("/organizer/api-keys")({
  head: () => ({
    ...seoHeadCreate("/organizer", { noindex: true }),
  }),
  loader: async () => {
    const result = await getOrganizerAccess()
    if (result.success) return { isServerAuthorized: true }
    if (result.errorMessage === "Eventoren-Veranstalterrolle erforderlich") throw redirect({ to: "/" })
    throw redirect({ to: "/sign-in", search: { returnTo: "/organizer/api-keys" } })
  },
  component: () => (
    <OrganizerShell>
      <EventorenApiKeysPage />
    </OrganizerShell>
  ),
})
