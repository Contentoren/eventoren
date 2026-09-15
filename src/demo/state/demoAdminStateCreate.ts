import { demoAdminCatalogPageStateCreate } from "./demoAdminCatalogPageStateCreate.ts"
import { demoAdminMemberManagementStateCreate } from "./demoAdminMemberManagementStateCreate.ts"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"

export function demoAdminStateCreate(inputs: {
  readonly memberScenario?: "populated" | "empty" | "error"
  readonly newEvent?: boolean
  readonly authorized?: boolean
}) {
  const catalog = demoAdminCatalogPageStateCreate({ events: demoCatalogEvents, authorized: inputs.authorized })
  const members = inputs.authorized === false ? undefined : demoAdminMemberManagementStateCreate(inputs.memberScenario)
  if (inputs.newEvent) catalog.startNewEvent()
  return { catalog, members }
}
