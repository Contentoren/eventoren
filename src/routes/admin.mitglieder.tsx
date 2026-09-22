import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminMemberManagement } from "../admin/AdminMemberManagement.tsx"
import { adminMemberManagementStateCreate } from "../admin/adminMemberManagementStateCreate.ts"
import { adminZitadelMembersGet } from "../server/adminZitadelMembersGet.ts"
import { adminZitadelOrganizerGrantFromSession } from "../server/adminZitadelOrganizerGrantFromSession.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

const getAdminMembers = createServerFn({ method: "GET" })
  .validator((input: { readonly limit?: number; readonly offset?: number; readonly search?: string }) => input)
  .handler(({ data }) => adminZitadelMembersGet(data))

const changeAdminMemberRole = createServerFn({ method: "POST" })
  .validator((input: { readonly operation: "grant" | "revoke"; readonly zitadelUserId: string }) => input)
  .handler(({ data }) => adminZitadelOrganizerGrantFromSession(data))

export const Route = createFileRoute("/admin/mitglieder")({
  component: AdminMembersRoute,
})

function AdminMembersRoute() {
  const state = adminMemberManagementStateCreate({
    list: (input) => getAdminMembers({ data: { search: input.search } }),
    roleChange: (input) => changeAdminMemberRole({ data: input }),
  })

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        <header class="flex flex-col gap-3">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Verwaltung</p>
          <h2 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Mitglieder</h2>
        </header>
        <AdminMemberManagement state={state} />
      </UiContainer>
    </main>
  )
}
