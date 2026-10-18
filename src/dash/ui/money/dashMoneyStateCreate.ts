import { eventPriceFormat } from "#src/events/eventPriceFormat.ts"

export function dashMoneyStateCreate(inputs: { cents: () => number; signed: () => boolean | undefined }) {
  const text = () => {
    const cents = inputs.cents()
    if (cents >= 0 && inputs.signed() !== true) return eventPriceFormat(cents)
    if (cents >= 0) return `+${eventPriceFormat(cents)}`
    return `−${eventPriceFormat(-cents)}`
  }

  return { text }
}

export type DashMoneyState = ReturnType<typeof dashMoneyStateCreate>
