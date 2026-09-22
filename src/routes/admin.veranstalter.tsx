import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminOrganizerMembersPage } from "../admin/AdminOrganizerMembersPage.tsx"
import { adminOrganizerMembersPageStateCreate } from "../admin/adminOrganizerMembersPageStateCreate.ts"
import { adminZitadelOrganizerMembersGet } from "../server/adminZitadelOrganizerMembersGet.ts"

const getAdminOrganizerMembers = createServerFn({ method: "GET" }).handler(adminZitadelOrganizerMembersGet)

export const Route = createFileRoute("/admin/veranstalter")({
  component: AdminOrganizerMembersRoute,
})

function AdminOrganizerMembersRoute() {
  const state = adminOrganizerMembersPageStateCreate({ list: () => getAdminOrganizerMembers() })
  return <AdminOrganizerMembersPage state={state} />
}
