import { createMemo, createSignal } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizerDashboardExportKind } from "./organizerDashboardExportFilterSchema.ts"
import {
  organizerDashboardExportCsvCreate,
  organizerDashboardExportPdfCreate,
  organizerDashboardExportRowsCreate,
  organizerDashboardExportXlsxCreate,
  type OrganizerDashboardExportCheckIn,
  type OrganizerDashboardExportOrder,
  type OrganizerDashboardExportParticipant,
} from "./organizerDashboardExportRowsCreate.ts"
import { organizerDashboardExportIcsCreate } from "./organizerDashboardExportIcsCreate.ts"

export type VeranstalterDashboardExportEvent = {
  readonly title: string
  readonly description: string
  readonly startsAt: string
  readonly endsAt: string
  readonly venue: string
  readonly city: string
}

const pageSize = 50

/**
 * Permission-filtered export section state for one event. Teilnehmer and
 * Bestellungen need bestellungen.sehen, Check-ins need einlass.nutzen; the
 * backend enforces the same. Rows stream from the live export query with
 * pagination; CSV/XLSX/PDF/ICS bytes are built client-side with the shared
 * pure helpers (Berlin display, semicolon CSV, UTC ICS).
 */
export function veranstalterDashboardExportStateCreate(inputs: {
  orgId: () => string | undefined
  eventKey: () => string | undefined
  event: () => VeranstalterDashboardExportEvent | undefined
  canReadOrders: () => boolean
  canCheckIn: () => boolean
}) {
  const kind = createSignalObject<OrganizerDashboardExportKind>("teilnehmer")
  const [cursor, setCursor] = createSignal<string | null>(null)
  const [cursorStack, setCursorStack] = createSignal<readonly (string | null)[]>([])
  const message = createSignalObject("")
  const busy = createSignalObject(false)

  const canReadKind = (list: OrganizerDashboardExportKind): boolean =>
    list === "checkins" ? inputs.canCheckIn() : inputs.canReadOrders()

  const page = queryCreate(api.organizerDashboardExports.organizerDashboardExportListQuery, () => {
    const orgId = inputs.orgId()
    const eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canReadKind(kind.get())) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      eventKey,
      kind: kind.get(),
      paginationOpts: { numItems: pageSize, cursor: cursor() },
    }
  })

  const rows = createMemo(() => {
    const current = page()
    if (!current || !("success" in current) || !current.success) return []
    return current.data.rows
  })

  const isDone = createMemo(() => {
    const current = page()
    if (!current || !("success" in current) || !current.success) return true
    return current.data.isDone
  })

  const error = createMemo(() => {
    const current = page()
    if (current && "success" in current && !current.success) return current.errorMessage
    return null
  })

  const selectKind = (next: OrganizerDashboardExportKind) => {
    kind.set(next)
    setCursor(null)
    setCursorStack([])
    message.set("")
  }

  const next = () => {
    const current = page()
    if (!current || !("success" in current) || !current.success || current.data.isDone) return
    setCursorStack((stack) => [...stack, cursor()])
    setCursor(current.data.continueCursor)
  }

  const first = () => {
    setCursor(null)
    setCursorStack([])
  }

  const previousAvailable = () => cursorStack().length > 0

  const back = () => {
    const stack = cursorStack()
    if (stack.length === 0) return
    setCursor(stack[stack.length - 1] ?? null)
    setCursorStack(stack.slice(0, -1))
  }

  const stringRows = (): string[][] => {
    const current = kind.get()
    const items = rows()
    if (current === "teilnehmer") {
      return organizerDashboardExportRowsCreate(
        current,
        items.filter((row) => row.kind === "teilnehmer") as OrganizerDashboardExportParticipant[],
      )
    }
    if (current === "bestellungen") {
      return organizerDashboardExportRowsCreate(
        current,
        items.filter((row) => row.kind === "bestellungen") as OrganizerDashboardExportOrder[],
      )
    }
    return organizerDashboardExportRowsCreate(
      current,
      items.filter((row) => row.kind === "checkins") as OrganizerDashboardExportCheckIn[],
    )
  }

  const downloadBlob = (bytes: Uint8Array | string, mediaType: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mediaType }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const fileBase = () => `${kind.get()}-${inputs.eventKey() ?? "event"}`

  const downloadCsv = () => {
    downloadBlob(
      organizerDashboardExportCsvCreate(kind.get(), stringRows()),
      "text/csv;charset=utf-8",
      `${fileBase()}.csv`,
    )
    message.set("CSV exportiert.")
  }

  const downloadXlsx = () => {
    downloadBlob(
      organizerDashboardExportXlsxCreate(kind.get(), kind.get(), stringRows()),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      `${fileBase()}.xlsx`,
    )
    message.set("Excel exportiert.")
  }

  const downloadPdf = async () => {
    if (busy.get()) return
    busy.set(true)
    try {
      const event = inputs.event()
      const result = await organizerDashboardExportPdfCreate(
        `Export ${kind.get()} · ${event?.title ?? inputs.eventKey() ?? ""}`,
        `Stand: Europe/Berlin · ${rows().length} Zeilen in diesem Fenster`,
        kind.get(),
        stringRows(),
      )
      if (!result.success) {
        message.set("PDF-Export fehlgeschlagen.")
        return
      }
      downloadBlob(result.data, "application/pdf", `${fileBase()}.pdf`)
      message.set("PDF exportiert.")
    } finally {
      busy.set(false)
    }
  }

  const downloadIcs = () => {
    const event = inputs.event()
    if (!event) {
      message.set("Kalenderexport braucht die Eventdaten.")
      return
    }
    const attendees =
      kind.get() === "teilnehmer"
        ? (rows().filter((row) => row.kind === "teilnehmer") as OrganizerDashboardExportParticipant[])
            .map((row) => row.email)
            .filter((email) => email.length > 0)
        : []
    const ics = organizerDashboardExportIcsCreate({
      uid: `${inputs.eventKey()}@eventoren`,
      title: event.title,
      description: event.description,
      location: `${event.venue}, ${event.city}`,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      url: typeof window === "undefined" ? "" : window.location.href,
      attendees,
    })
    downloadBlob(ics, "text/calendar;charset=utf-8", `${fileBase()}.ics`)
    message.set("Kalenderdatei exportiert.")
  }

  return {
    kind,
    rows,
    isDone,
    error,
    message,
    busy,
    canReadKind,
    selectKind,
    next,
    first,
    back,
    previousAvailable,
    downloadCsv,
    downloadXlsx,
    downloadPdf,
    downloadIcs,
  }
}
