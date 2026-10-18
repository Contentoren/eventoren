import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashVoucherValidity } from "../../model/dashVoucherValiditySchema.ts"

export type DashVoucherCreateSheetState = {
  amountCents: ReturnType<typeof createSignalObject<number | null>>
  chipAmount: ReturnType<typeof createSignalObject<number | null>>
  kind: ReturnType<typeof createSignalObject<"verkauft" | "kostenlos">>
  recipientName: ReturnType<typeof createSignalObject<string>>
  recipientEmail: ReturnType<typeof createSignalObject<string>>
  message: ReturnType<typeof createSignalObject<string>>
  validity: ReturnType<typeof createSignalObject<DashVoucherValidity>>
  customDate: ReturnType<typeof createSignalObject<string>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
}

/** Formular-State für „Gutschein erstellen“: Betrag, Art, Empfänger, Nachricht, Laufzeit. */
export function DashVoucherCreateSheetStateCreate(defaultValidity: DashVoucherValidity): DashVoucherCreateSheetState {
  return {
    amountCents: createSignalObject<number | null>(5000),
    chipAmount: createSignalObject<number | null>(5000),
    kind: createSignalObject<"verkauft" | "kostenlos">("verkauft"),
    recipientName: createSignalObject(""),
    recipientEmail: createSignalObject(""),
    message: createSignalObject(""),
    validity: createSignalObject<DashVoucherValidity>(defaultValidity),
    customDate: createSignalObject(""),
    showErrors: createSignalObject(false),
  }
}
