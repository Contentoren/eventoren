import { onCleanup, onMount } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashRandomCreate } from "../../model/dashRandomCreate.ts"
import type { DashEvent } from "../../model/dashEventSchema.ts"
import { dashCheckinSimulateTick } from "../../store/actions/checkin/dashCheckinSimulateTick.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashCheckinStats } from "./model/dashCheckinStats.ts"
import type { DashCheckinScanFilter } from "./model/dashCheckinScanFilter.ts"

export interface DashCheckinSearch {
  scans: DashCheckinScanFilter
}

const dashCheckinScansField = v.optional(v.picklist(["alle", "akzeptiert", "abgelehnt"]), "alle")

/** Leniente Search-Parse für den Scan-Filter: ungültige Werte fallen auf "alle" zurück. */
export function dashCheckinSearchParse(raw: Record<string, unknown>): DashCheckinSearch {
  const parsed = v.safeParse(dashCheckinScansField, raw["scans"])
  return { scans: parsed.success ? parsed.output : "alle" }
}

export type DashCheckinPhase = "vor" | "live" | "nach"

function phaseAt(event: DashEvent | null, at: Date): DashCheckinPhase {
  if (!event) return "nach"
  if (at < new Date(event.doorsAt ?? event.startsAt)) return "vor"
  if (at >= new Date(event.endsAt)) return "nach"
  return "live"
}

/** Seiten-State Live-Einlass: Berechtigung, Kennzahlen, Live-Phase und Simulation. */
export function dashCheckinPageStateCreate(inputs: {
  eventId: () => string
  search: () => DashCheckinSearch
  onPatch: (patch: Partial<DashCheckinSearch>) => void
}) {
  const now = dashNow()
  const tickRandom = dashRandomCreate(20261018)
  const simOn = createSignalObject(phaseAt(dashEventById(inputs.eventId()), new Date()) === "live")

  const can = () => dashCan("einlass.nutzen")
  const event = () => dashEventById(inputs.eventId())
  const stats = () => dashCheckinStats(dashStateGet(), inputs.eventId(), now())
  const eventScans = () =>
    dashStateGet()
      .scans.filter((scan) => scan.eventId === inputs.eventId())
      .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : 0))
  const phase = (): DashCheckinPhase => phaseAt(event(), now())
  const scansFilter = () => inputs.search().scans

  const toggleSim = (next: boolean) => simOn.set(next)
  const setScans = (scans: DashCheckinScanFilter) => inputs.onPatch({ scans })

  onMount(() => {
    if (typeof window === "undefined") return
    let timer: number | undefined
    let stopped = false
    const tick = () => {
      if (stopped) return
      if (simOn.get()) {
        dashCheckinSimulateTick({ eventId: inputs.eventId(), random: tickRandom, now: new Date() })
      }
      const delay = 4000 + tickRandom() * 4000
      timer = window.setTimeout(tick, delay)
    }
    timer = window.setTimeout(tick, 4000 + tickRandom() * 4000)
    onCleanup(() => {
      stopped = true
      if (timer !== undefined) window.clearTimeout(timer)
    })
  })

  return { can, event, stats, eventScans, phase, simOn, toggleSim, scansFilter, setScans }
}

export type DashCheckinPageState = ReturnType<typeof dashCheckinPageStateCreate>
