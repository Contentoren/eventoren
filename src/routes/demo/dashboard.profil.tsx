import { createFileRoute } from "@tanstack/solid-router"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"

import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashActiveOrg } from "../../dash/store/dashActiveOrg.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { dashProfilePageStateCreate } from "../../dash/pages/profile/dashProfilePageStateCreate.ts"
import { DashProfilePage } from "../../dash/pages/profile/ui/DashProfilePage.tsx"

export const Route = createFileRoute("/demo/dashboard/profil")({
  head: () =>
    demoRouteHeadCreate(
      "Profil · Eventoren Demo",
      "Öffentliches Profil deiner Organisation.",
      "/demo/dashboard/profil",
    ),
  component: DashboardProfileRoute,
})

function DashboardProfileRoute() {
  const state = dashProfilePageStateCreate()
  const org = () => dashActiveOrg()
  return (
    <div>
      <DashPageHeader
        title="Profil"
        description="So sehen dich deine Gäste."
        actions={
          <span class="flex flex-wrap gap-2">
            <LinkButtonInternal
              to="/demo/customer/veranstalter/$orgSlug"
              params={{ orgSlug: org()?.slug ?? "" }}
              variant="outline"
              icon={mdiOpenInNew}
              newTab
              class="h-9 px-3 text-sm"
            >
              Profil ansehen
            </LinkButtonInternal>
          </span>
        }
      />
      <DashProfilePage state={state} />
    </div>
  )
}
