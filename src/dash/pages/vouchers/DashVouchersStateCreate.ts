import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashVoucherValidity } from "../../model/dashVoucherValiditySchema.ts"

export type DashVouchersState = {
  createOpen: ReturnType<typeof createSignalObject<boolean>>
  detailId: ReturnType<typeof createSignalObject<string | null>>
  successId: ReturnType<typeof createSignalObject<string | null>>
  validityValue: ReturnType<typeof createSignalObject<DashVoucherValidity>>
  validityDate: ReturnType<typeof createSignalObject<string>>
  deactivateOpen: ReturnType<typeof createSignalObject<boolean>>
}

/** Listen-State der Gutscheinseite: Create-Sheet, Detail, Erfolgsansicht und Laufzeit-Dialog. */
export function DashVouchersStateCreate(): DashVouchersState {
  return {
    createOpen: createSignalObject(false),
    detailId: createSignalObject<string | null>(null),
    successId: createSignalObject<string | null>(null),
    validityValue: createSignalObject<DashVoucherValidity>("3-jahre-jahresende"),
    validityDate: createSignalObject(""),
    deactivateOpen: createSignalObject(false),
  }
}
