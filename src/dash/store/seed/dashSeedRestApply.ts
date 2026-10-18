import type { DashState } from "../../model/dashStateSchema.ts"

import { dashSeedAuditApply } from "./dashSeedAuditApply.ts"
import { dashSeedBoxOfficeApply } from "./dashSeedBoxOfficeApply.ts"
import { dashSeedGuestsApply } from "./dashSeedGuestsApply.ts"
import { dashSeedPayoutsApply } from "./dashSeedPayoutsApply.ts"
import { dashSeedScansApply } from "./dashSeedScansApply.ts"

/**
 * Wendet alle B4c-Seeds an: Gäste, Abendkasse, Scans, Auszahlungen, Protokoll.
 */
export function dashSeedRestApply(state: DashState, now: Date): DashState {
  const withGuests = dashSeedGuestsApply(state, now)
  const withBoxOffice = dashSeedBoxOfficeApply(withGuests, now)
  const withScans = dashSeedScansApply(withBoxOffice, now)
  const withPayouts = dashSeedPayoutsApply(withScans, now)
  return dashSeedAuditApply(withPayouts, now)
}
