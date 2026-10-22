import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { veranstalterOrganisationenAdminSearchParse } from "../organizer/dashboard/pages/admin/ui/veranstalterOrganisationenAdminSearchParse.ts"
import { veranstalterOrganisationenAdminPageStateCreate } from "../organizer/dashboard/pages/admin/ui/veranstalterOrganisationenAdminPageStateCreate.ts"
import { VeranstalterOrganisationenAdminPage } from "../organizer/dashboard/pages/admin/ui/VeranstalterOrganisationenAdminPage.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/admin_/veranstalter-organisationen")({
  validateSearch: (input: unknown) => veranstalterOrganisationenAdminSearchParse(input),
  head: () => ({
    ...seoHeadCreate("/admin/veranstalter-organisationen", { noindex: true }),
  }),
  component: VeranstalterOrganisationenAdminRoute,
})

function VeranstalterOrganisationenAdminRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const to = "/admin/veranstalter-organisationen"
  const state = veranstalterOrganisationenAdminPageStateCreate({
    search,
    selectOrg: (orgId) => void navigate({ to, search: (prior) => ({ ...prior, org: orgId }), replace: false }),
  })
  return (
    <VeranstalterOrganisationenAdminPage
      state={state}
      status={() => search().status ?? "alle"}
      selectStatusFilter={(status) =>
        void navigate({
          to,
          search: (prior) => ({
            ...prior,
            status: status === "alle" ? undefined : (status as "pruefung" | "aktiv" | "gesperrt"),
          }),
          replace: true,
        })
      }
    />
  )
}
