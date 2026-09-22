import { demoAdminCatalogPageStateCreate } from "./demoAdminCatalogPageStateCreate.ts"
import { demoAdminMemberManagementStateCreate } from "./demoAdminMemberManagementStateCreate.ts"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoAdminStateCreate(inputs: {
  readonly memberScenario?: "populated" | "empty" | "error"
  readonly newEvent?: boolean
  readonly authorized?: boolean
  readonly flow?: DemoFlowContextValue
}) {
  const flow = inputs.flow ?? demoFlowContextUse()
  const catalog = demoAdminCatalogPageStateCreate({
    events: demoCatalogEvents,
    authorized: inputs.authorized,
    flow,
  })
  const members =
    inputs.authorized === false
      ? undefined
      : demoAdminMemberManagementStateCreate({ scenario: inputs.memberScenario, flow })
  if (inputs.newEvent) catalog.startNewEvent()
  const currentId = inputs.newEvent
    ? "admin-new"
    : inputs.authorized === false
      ? "admin-unauthorized"
      : inputs.memberScenario === "empty"
        ? "admin-empty"
        : inputs.memberScenario === "error"
          ? "admin-error"
          : "admin"
  return { catalog, members, currentId }
}
