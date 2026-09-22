import { AdminMemberManagement } from "../../admin/AdminMemberManagement.tsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { demoAdminMemberManagementStateCreate } from "../state/demoAdminMemberManagementStateCreate.ts"
import { DemoAdminNav } from "./DemoAdminNav.tsx"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoAdminMembers() {
  const state = demoAdminMemberManagementStateCreate("populated")

  return (
    <DemoScenarioFrame currentId="admin-members">
      <main id="content" tabindex="-1">
        <UiContainer width="wide" class="flex flex-col gap-8 py-10">
          <DemoAdminNav />
          <header class="flex flex-col gap-3">
            <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Verwaltung</p>
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Mitglieder</h1>
            <p class="max-w-3xl text-sm leading-relaxed text-content-muted">
              Lokale Demo zur Mitglieder- und Rollenverwaltung ohne Zitadel- oder Backend-Verbindung.
            </p>
          </header>
          <AdminMemberManagement state={state} />
        </UiContainer>
      </main>
    </DemoScenarioFrame>
  )
}
