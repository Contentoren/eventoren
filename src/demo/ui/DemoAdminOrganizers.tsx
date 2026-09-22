import { AdminOrganizerMembersPage } from "../../admin/AdminOrganizerMembersPage.tsx"
import { demoAdminOrganizerMembersPageStateCreate } from "../state/demoAdminOrganizerMembersPageStateCreate.ts"
import { DemoAdminNav } from "./DemoAdminNav.tsx"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoAdminOrganizers() {
  const state = demoAdminOrganizerMembersPageStateCreate()

  return (
    <DemoScenarioFrame currentId="admin-organizers">
      <AdminOrganizerMembersPage state={state} headerSlot={<DemoAdminNav />} />
    </DemoScenarioFrame>
  )
}
