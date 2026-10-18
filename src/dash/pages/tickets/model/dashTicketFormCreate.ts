import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { DashTicketChannel } from "../../../model/dashTicketChannelSchema.ts"

export type DashTicketPhaseForm = {
  id: string
  name: SignalObject<string>
  priceCents: SignalObject<number | null>
  endsAt: SignalObject<string | null>
  quota: SignalObject<number | null>
}

export type DashTicketForm = {
  name: SignalObject<string>
  description: SignalObject<string>
  channel: SignalObject<DashTicketChannel>
  capacity: SignalObject<number | null>
  maxPerOrder: SignalObject<number | null>
  taxRateBps: SignalObject<1900 | 700>
  hidden: SignalObject<boolean>
  startMode: SignalObject<"sofort" | "datum">
  startAt: SignalObject<string | null>
  endMode: SignalObject<"eventbeginn" | "datum">
  endAt: SignalObject<string | null>
  phases: SignalObject<DashTicketPhaseForm[]>
}

export type DashTicketFormInitial = {
  name?: string
  description?: string
  channel?: DashTicketChannel
  capacity?: number | null
  maxPerOrder?: number | null
  taxRateBps?: 1900 | 700
  hidden?: boolean
  salesStartAt?: string | null
  salesEndAt?: string | null
  phases?: Array<{ id: string; name: string; priceCents: number | null; endsAt: string | null; quota: number | null }>
}

function phaseIdCreate(): string {
  return `ph-form-${Math.random().toString(36).slice(2, 10)}`
}

function phaseFormCreate(input?: {
  id: string
  name: string
  priceCents: number | null
  endsAt: string | null
  quota: number | null
}): DashTicketPhaseForm {
  return {
    id: input?.id ?? phaseIdCreate(),
    name: createSignalObject(input?.name ?? ""),
    priceCents: createSignalObject<number | null>(input?.priceCents ?? null),
    endsAt: createSignalObject<string | null>(input?.endsAt ?? null),
    quota: createSignalObject<number | null>(input?.quota ?? null),
  }
}

/** Formular-State für das Ticketart-Sheet (reine Signale, keine Validierung). */
export function dashTicketFormCreate(initial?: DashTicketFormInitial): DashTicketForm {
  const startMode = initial?.salesStartAt ? "datum" : "sofort"
  const endMode = initial?.salesEndAt ? "datum" : "eventbeginn"
  return {
    name: createSignalObject(initial?.name ?? ""),
    description: createSignalObject(initial?.description ?? ""),
    channel: createSignalObject<DashTicketChannel>(initial?.channel ?? "online"),
    capacity: createSignalObject<number | null>(initial?.capacity ?? null),
    maxPerOrder: createSignalObject<number | null>(initial?.maxPerOrder ?? 10),
    taxRateBps: createSignalObject<1900 | 700>(initial?.taxRateBps ?? 700),
    hidden: createSignalObject(initial?.hidden ?? false),
    startMode: createSignalObject<"sofort" | "datum">(startMode as "sofort" | "datum"),
    startAt: createSignalObject<string | null>(initial?.salesStartAt ?? null),
    endMode: createSignalObject<"eventbeginn" | "datum">(endMode as "eventbeginn" | "datum"),
    endAt: createSignalObject<string | null>(initial?.salesEndAt ?? null),
    phases: createSignalObject<DashTicketPhaseForm[]>(
      (initial?.phases ?? [{ id: phaseIdCreate(), name: "Regulär", priceCents: null, endsAt: null, quota: null }]).map(
        (phase) => phaseFormCreate(phase),
      ),
    ),
  }
}
