import { AdminCatalogPage } from "../../admin/AdminCatalogPage.tsx"
import { demoAdminStateCreate } from "../state/demoAdminStateCreate.ts"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { DemoAdminNav } from "./DemoAdminNav.tsx"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoAdmin(props: {
  readonly memberScenario?: "populated" | "empty" | "error"
  readonly newEvent?: boolean
  readonly authorized?: boolean
}) {
  const flow = demoFlowContextUse()
  const state = demoAdminStateCreate({ ...props, flow })

  return (
    <DemoScenarioFrame currentId={state.currentId}>
      <AdminCatalogPage
        state={state.catalog}
        memberState={state.members}
        description="Änderungen werden sofort in der lokalen Fixture-Liste übernommen. Es werden keine Sitzungen, Mutationen oder Serverdaten verwendet."
        headerSlot={<DemoAdminNav />}
        eventViewHref={(eventKey) => `/demo/customer/events/${eventKey}`}
      />
    </DemoScenarioFrame>
  )
}
