import { cn } from "cn"
import { dashMoneyStateCreate } from "./dashMoneyStateCreate.ts"

export interface DashMoneyProps {
  cents: number
  signed?: boolean
  class?: string
  muted?: boolean
}

/** Geldbetrag in Cent als deutsches Euro-Format mit Tabellenziffern; negativ mit echtem Minus. */
export function DashMoney(p: DashMoneyProps) {
  const state = dashMoneyStateCreate({ cents: () => p.cents, signed: () => p.signed })

  return <span class={cn("tabular-nums", (p.muted ?? false) && "text-content-muted", p.class)}>{state.text()}</span>
}
