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
