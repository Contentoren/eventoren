import { eventBookingCountdownGet } from "./eventBookingCountdownGet.ts"

export function eventBookingCountdownPartsGet(opensAt: string | undefined, now: number) {
  const countdown = eventBookingCountdownGet(opensAt, now)
  return [
    { label: "Tage", value: String(countdown?.days ?? 0).padStart(2, "0") },
    { label: "Stunden", value: String(countdown?.hours ?? 0).padStart(2, "0") },
    { label: "Minuten", value: String(countdown?.minutes ?? 0).padStart(2, "0") },
    { label: "Sekunden", value: String(countdown?.seconds ?? 0).padStart(2, "0") },
  ]
}
