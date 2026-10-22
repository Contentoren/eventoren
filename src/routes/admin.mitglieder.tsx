import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import * as v from "valibot"
import { AdminMemberManagement } from "../admin/AdminMemberManagement.tsx"
import { adminMemberManagementStateCreate } from "../admin/adminMemberManagementStateCreate.ts"
import { zitadelRole } from "../auth/model_field/zitadelRole.ts"
import { adminZitadelMembersGet } from "../server/adminZitadelMembersGet.ts"
import { adminZitadelRolesSetFromSession } from "../server/adminZitadelRolesSetFromSession.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

const getAdminMembers = createServerFn({ method: "GET" })
  .validator((input: { readonly limit?: number; readonly offset?: number; readonly search?: string }) => input)
  .handler(({ data }) => adminZitadelMembersGet(data))

const rolesSchema = v.array(
  v.picklist([zitadelRole.admin, zitadelRole.user, zitadelRole.organizer, zitadelRole.customer]),
)

const changeAdminMemberRoles = createServerFn({ method: "POST" })
  .validator((input: { readonly roles: readonly string[]; readonly zitadelUserId: string }) => {
    const parsed = v.safeParse(v.object({ roles: rolesSchema, zitadelUserId: v.string() }), input)
    if (!parsed.success) throw new Error(v.summarize(parsed.issues))
    return parsed.output
  })
  .handler(({ data }) => adminZitadelRolesSetFromSession(data))

export const Route = createFileRoute("/admin/mitglieder")({
  component: AdminMembersRoute,
})

function AdminMembersRoute() {
  const state = adminMemberManagementStateCreate({
    list: (input) => getAdminMembers({ data: { search: input.search } }),
    setRoles: (input) => changeAdminMemberRoles({ data: input }),
  })

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        <header class="flex flex-col gap-3">
          <h2 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Mitglieder</h2>
        </header>
        <AdminMemberManagement state={state} />
      </UiContainer>
    </main>
  )
}
