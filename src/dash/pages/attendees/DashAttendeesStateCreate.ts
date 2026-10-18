import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashTableExport, type DashTableExportFormat } from "../../export/dashTableExport.ts"
import { dashTicketCheckIn } from "../../store/actions/dashTicketCheckIn.ts"
import { dashTicketCheckInUndo } from "../../store/actions/dashTicketCheckInUndo.ts"
import { dashAttendeeListFilter, type DashAttendeeListResult } from "./model/dashAttendeeListFilter.ts"
import { dashAttendeeExportRowsCreate, type DashAttendeeExportPayloads } from "./model/dashAttendeeExportRows.ts"
import type {
  DashAttendeeCheckinFilter,
  DashAttendeeKanalFilter,
  DashAttendeeSearch,
} from "./model/dashAttendeeSearchParse.ts"

/** Seiten-State Teilnehmer: Filter aus der URL, abgeleitete Zeilen, Check-in-Aktionen, Exporte und Druck. */
export function dashAttendeesStateCreate(inputs: {
  eventId: () => string
  search: () => DashAttendeeSearch
  onPatch: (patch: Partial<DashAttendeeSearch>) => void
}) {
  const qDraft = createSignalObject(inputs.search().q)
  const visibleCount = createSignalObject(50)

  createEffect(
    on(
      () => inputs.search().q,
      (q) => qDraft.set(q),
    ),
  )

  const canSeeOrders = () => dashCan("bestellungen.sehen")
  const canCheckIn = () => dashCan("einlass.nutzen")
  const canSee = () => canSeeOrders() || canCheckIn()
  const event = () => dashEventById(inputs.eventId())
  const state = () => dashStateGet()

  const ticketTypeName = (ticketTypeId: string): string =>
    state().ticketTypes.find((type) => type.id === ticketTypeId)?.name ?? "—"

  const ticketTypes = () => state().ticketTypes.filter((type) => type.eventId === inputs.eventId())

  const eventTickets = () => state().tickets.filter((ticket) => ticket.eventId === inputs.eventId())
  const eventOrders = () => state().orders.filter((order) => order.eventId === inputs.eventId())

  const result = (): DashAttendeeListResult =>
    dashAttendeeListFilter({
      tickets: eventTickets(),
      orders: state().orders,
      ticketTypeName,
      q: inputs.search().q,
      ticketart: inputs.search().ticketart,
      checkin: inputs.search().checkin,
      kanal: inputs.search().kanal,
    })

  const exports = (): DashAttendeeExportPayloads =>
    dashAttendeeExportRowsCreate({
      filtered: result().rows,
      tickets: eventTickets(),
      orders: state().orders,
      scans: state().scans,
      event: event(),
      ticketTypeName,
    })

  let qTimer: ReturnType<typeof setTimeout> | null = null
  const applyQ = (value: string) => {
    qDraft.set(value)
    if (qTimer) clearTimeout(qTimer)
    qTimer = setTimeout(() => inputs.onPatch({ q: value }), 250)
  }

  const resetFilter = () => {
    qDraft.set("")
    visibleCount.set(50)
    inputs.onPatch({ q: "", ticketart: "", checkin: "alle", kanal: "alle" })
  }

  const applyTicketart = (ticketart: string) => {
    visibleCount.set(50)
    inputs.onPatch({ ticketart })
  }

  const applyCheckin = (checkin: DashAttendeeCheckinFilter) => {
    visibleCount.set(50)
    inputs.onPatch({ checkin })
  }

  const applyKanal = (kanal: DashAttendeeKanalFilter) => {
    visibleCount.set(50)
    inputs.onPatch({ kanal })
  }

  const checkIn = (ticketId: string, holderName: string) => {
    const done = dashTicketCheckIn(ticketId, "Haupteingang")
    if (!done.success) toastAdd({ title: done.errorMessage, variant: "error" })
    else toastAdd({ title: `„${holderName}“ eingecheckt`, variant: "success" })
  }

  const checkInUndo = (ticketId: string, holderName: string) => {
    const done = dashTicketCheckInUndo(ticketId)
    if (!done.success) toastAdd({ title: done.errorMessage, variant: "error" })
    else toastAdd({ title: `Check-in von „${holderName}“ zurückgenommen`, variant: "success" })
  }

  const exportRun = (groupId: string, format: DashTableExportFormat) => {
    const now = dashNow()()
    const eventTitle = event()?.title ?? exports().eventFallback.title
    const eventDate = event()?.startsAt ?? exports().eventFallback.startsAt
    const payload = exports()
    if (groupId === "teilnehmer") {
      const filteredCount = result().rows.length
      return dashTableExport({
        format,
        fileParts: ["Teilnehmerliste", eventTitle],
        title: `Einlassliste – ${eventTitle}`,
        subtitle: `${dashDateFormat(eventDate, "datum")} · Gefiltert (${filteredCount})`,
        columns: [{ header: "Name" }, { header: "Ticketart" }, { header: "Code" }],
        rows: payload.teilnehmerRows,
        checkboxColumn: format === "pdf",
        orientation: "landscape",
        now,
      })
    }
    if (groupId === "bestellungen") {
      return dashTableExport({
        format,
        fileParts: ["Bestellungen", eventTitle],
        title: `Bestellungen · ${eventTitle}`,
        subtitle: `Alle (${payload.orderRows.length}) · Stand ${dashDateFormat(now.toISOString(), "kurz")}`,
        columns: [
          { header: "Nummer" },
          { header: "Datum" },
          { header: "Käufer" },
          { header: "E-Mail" },
          { header: "Tickets", align: "right" },
          { header: "Betrag", align: "right" },
          { header: "Zahlart" },
          { header: "Status" },
        ],
        rows: payload.orderRows,
        orientation: "landscape",
        now,
      })
    }
    return dashTableExport({
      format,
      fileParts: ["Check-ins", eventTitle],
      title: `Check-ins · ${eventTitle}`,
      subtitle: `Alle (${payload.scanRows.length}) · Stand ${dashDateFormat(now.toISOString(), "kurz")}`,
      columns: [
        { header: "Zeit" },
        { header: "Eingang" },
        { header: "Ergebnis" },
        { header: "Gerät" },
        { header: "Code" },
        { header: "Name" },
      ],
      rows: payload.scanRows,
      orientation: "landscape",
      now,
    })
  }

  const print = () => {
    if (typeof window !== "undefined") window.print()
  }

  return {
    canSee,
    canSeeOrders,
    canCheckIn,
    event,
    ticketTypes,
    result,
    exports,
    qDraft,
    visibleCount,
    applyQ,
    resetFilter,
    applyTicketart,
    applyCheckin,
    applyKanal,
    checkIn,
    checkInUndo,
    exportRun,
    print,
  }
}

export type DashAttendeesState = ReturnType<typeof dashAttendeesStateCreate>
