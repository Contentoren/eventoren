import type { DashTicketTypeUpsertInput } from "../../../store/actions/dashTicketTypeUpsert.ts"
import type { DashTicketForm } from "./dashTicketFormCreate.ts"

function phaseIdCreate(): string {
  return `ph-${Math.random().toString(36).slice(2, 10)}`
}

/** Wandelt den Formular-State in einen Upsert-Input (IDs nur für bestehende Phasen beibehalten). */
export function dashTicketFormToInput(args: {
  form: DashTicketForm
  eventId: string
  ticketId?: string
  sortOrder?: number
  existingPhaseIds?: Set<string>
}): DashTicketTypeUpsertInput {
  const { form } = args
  return {
    ...(args.ticketId ? { id: args.ticketId } : {}),
    ...(args.sortOrder !== undefined ? { sortOrder: args.sortOrder } : {}),
    eventId: args.eventId,
    name: form.name.get().trim(),
    description: form.description.get().trim(),
    channel: form.channel.get(),
    hidden: form.hidden.get(),
    capacity: form.capacity.get() ?? 0,
    maxPerOrder: form.maxPerOrder.get() ?? 10,
    taxRateBps: form.taxRateBps.get(),
    archivedAt: null,
    salesStartAt: form.startMode.get() === "datum" ? form.startAt.get() : null,
    salesEndAt: form.endMode.get() === "datum" ? form.endAt.get() : null,
    phases: form.phases.get().map((phase) => ({
      id: args.existingPhaseIds?.has(phase.id) === true ? phase.id : phaseIdCreate(),
      name: phase.name.get().trim() === "" ? "Phase" : phase.name.get().trim(),
      priceCents: phase.priceCents.get() ?? 0,
      endsAt: phase.endsAt.get(),
      quota: phase.quota.get(),
    })),
  }
}
