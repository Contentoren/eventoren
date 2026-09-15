import { AdminCatalogPage } from "../../admin/AdminCatalogPage.tsx"
import { demoAdminStateCreate } from "../state/demoAdminStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoAdmin(props: {
  readonly memberScenario?: "populated" | "empty" | "error"
  readonly newEvent?: boolean
  readonly authorized?: boolean
}) {
  const state = demoAdminStateCreate(props)

  return (
    <DemoShell currentId={props.newEvent ? "admin-new" : props.authorized === false ? "admin-unauthorized" : "admin"}>
      <AdminCatalogPage
        state={state.catalog}
        memberState={state.members}
        description="Änderungen werden sofort in der lokalen Fixture-Liste übernommen. Es werden keine Sitzungen, Mutationen oder Serverdaten verwendet."
      />
    </DemoShell>
  )
}
