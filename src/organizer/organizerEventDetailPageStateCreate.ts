import { createEffect, createMemo, on, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"
import { userSessionBrowserRestore } from "../auth/ui/signals/userSessionBrowserRestore.ts"
import { userTokenGet } from "../auth/ui/signals/userSessionSignal.ts"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerDataSource } from "./OrganizerDataSource.ts"
import type { OrganizerDuplicateInfo } from "./OrganizerDuplicateInfo.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"
import { organizerDataSourceLiveCreate } from "./organizerDataSourceLiveCreate.ts"
import { organizerDuplicateInfoRead } from "./organizerDuplicateInfoRead.ts"
import { organizerTextGet } from "./organizerTextGet.ts"
import { organizerTicketScannerStateCreate } from "./organizerTicketScannerStateCreate.ts"

export function organizerEventDetailPageStateCreate(inputs: {
  readonly eventKey: () => string
  readonly initialSearch: () => string
  readonly initialTicketId: () => string
  readonly searchReplace: (search: string, ticketId: string) => void
  readonly dataSource?: OrganizerDataSource
  readonly token?: () => string
}): OrganizerEventDetailPageState {
  const dataSource = inputs.dataSource ?? organizerDataSourceLiveCreate()
  const events = createSignalObject<readonly OrganizerEvent[]>([])
  const tickets = createSignalObject<readonly OrganizerTicket[]>([])
  const selectedTicket = createSignalObject<OrganizerTicket | undefined>(undefined)
  const selectedTicketId = createSignalObject(inputs.initialTicketId())
  const search = createSignalObject(inputs.initialSearch())
  const loading = createSignalObject(true)
  const actionPending = createSignalObject(false)
  const actionError = createSignalObject<DetailActionError | null>(null)
  const actionSuccess = createSignalObject<DetailActionSuccess | null>(null)
  const duplicateInfo = createSignalObject<OrganizerDuplicateInfo | null>(null)
  const text = () => organizerTextGet(languageSignal.get())
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let scannerFeedbackClear = () => {}

  const tokenRead = () => inputs.token?.() ?? userTokenGet()
  const event = createMemo(() => events.get().find((item) => item.eventKey === inputs.eventKey()))

  const errorMessage = () => {
    const message = actionError.get()
    if (!message) return ""
    if (message.code === "load") return text().loadError
    return errorText(message.code, text())
  }

  const successMessage = () => {
    const message = actionSuccess.get()
    if (!message) return ""
    return message.code === "reset" ? text().resetSuccess : text().actionSuccess
  }

  const ticketLoad = async (searchValue: string) => {
    loading.set(true)
    try {
      const result = await dataSource.ticketList(inputs.eventKey(), searchValue, tokenRead())
      if (!result.success) {
        actionSuccess.set(null)
        actionError.set({ code: "load" })
        return
      }
      tickets.set(result.data)
      actionError.set(null)
      const selected = result.data.find((ticket) => ticket.id === selectedTicketId.get())
      if (selected) selectedTicket.set(selected)
      if (!selected && selectedTicketId.get()) void ticketDetailLoad(selectedTicketId.get())
    } catch {
      actionSuccess.set(null)
      actionError.set({ code: "load" })
    } finally {
      loading.set(false)
    }
  }

  const ticketDetailLoad = async (ticketId: string) => {
    const known = tickets.get().find((ticket) => ticket.id === ticketId)
    if (known) return selectedTicket.set(known)
    try {
      const result = await dataSource.ticketGet(inputs.eventKey(), ticketId as OrganizerTicket["id"], tokenRead())
      if (!result.success) {
        selectedTicket.set(undefined)
        actionSuccess.set(null)
        actionError.set({ code: "load" })
        return
      }
      selectedTicket.set(result.data)
    } catch {
      selectedTicket.set(undefined)
      actionSuccess.set(null)
      actionError.set({ code: "load" })
    }
  }

  const eventListLoad = async () => {
    try {
      const eventResult = await dataSource.eventList(tokenRead())
      if (eventResult.success) events.set(eventResult.data)
    } catch {
      // The ticket list still loads independently when the event list is unavailable.
    }
  }

  onMount(() => {
    if (!inputs.dataSource) userSessionBrowserRestore()
    void eventListLoad()
    void ticketLoad(search.get())
  })

  createEffect(
    on(
      () => [inputs.initialSearch(), inputs.initialTicketId()] as const,
      ([nextSearch, nextTicketId]) => {
        if (nextSearch !== search.get()) search.set(nextSearch)
        if (nextTicketId === selectedTicketId.get()) return
        selectedTicketId.set(nextTicketId)
        if (nextTicketId) void ticketDetailLoad(nextTicketId)
        if (!nextTicketId) selectedTicket.set(undefined)
      },
    ),
  )

  onCleanup(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })

  const searchChange = (value: string) => {
    search.set(value)
    selectedTicketId.set("")
    selectedTicket.set(undefined)
    actionSuccess.set(null)
    actionError.set(null)
    duplicateInfo.set(null)
    scannerFeedbackClear()
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      const update = () => {
        inputs.searchReplace(value, "")
        void ticketLoad(value)
      }
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(update)
        return
      }
      update()
    }, 250)
  }

  const ticketSelect = (ticket: OrganizerTicket) => {
    selectedTicketId.set(ticket.id)
    selectedTicket.set(ticket)
    actionError.set(null)
    actionSuccess.set(null)
    duplicateInfo.set(null)
    scannerFeedbackClear()
    inputs.searchReplace(search.get(), ticket.id)
  }

  const resultApply = (result: OrganizerDataResult<OrganizerTicket>, successCode: DetailActionSuccess["code"]) => {
    actionPending.set(false)
    if (!result.success) {
      actionSuccess.set(null)
      duplicateInfo.set(
        result.errorCode === "organizer.check-in.duplicate" ? organizerDuplicateInfoRead(result.errorData) : null,
      )
      actionError.set({ code: actionErrorCodeRead(result.errorCode) })
      scannerFeedbackClear()
      return
    }
    const updated = result.data
    selectedTicketId.set(updated.id)
    selectedTicket.set(updated)
    tickets.set(tickets.get().map((ticket) => (ticket.id === updated.id ? updated : ticket)))
    inputs.searchReplace(search.get(), updated.id)
    duplicateInfo.set(null)
    actionError.set(null)
    actionSuccess.set({ code: successCode })
    scannerFeedbackClear()
  }

  const ticketCheckIn = async () => {
    const ticket = selectedTicket.get()
    if (!ticket || actionPending.get()) return
    actionPending.set(true)
    try {
      resultApply(await dataSource.ticketCheckIn(inputs.eventKey(), ticket.id, tokenRead()), "check-in")
    } catch {
      resultApply({ success: false, errorMessage: text().actionFailed }, "check-in")
    } finally {
      actionPending.set(false)
    }
  }

  const ticketCheckInCode = async (ticketCode: string): Promise<OrganizerDataResult<OrganizerTicket>> => {
    if (actionPending.get()) {
      return {
        success: false,
        errorMessage: text().actionFailed,
        errorCode: "organizer.check-in.busy",
      }
    }
    actionPending.set(true)
    try {
      const result = await dataSource.ticketCheckInCode(inputs.eventKey(), ticketCode, tokenRead())
      resultApply(result, "check-in")
      return result
    } catch {
      const result: OrganizerDataResult<OrganizerTicket> = { success: false, errorMessage: text().actionFailed }
      resultApply(result, "check-in")
      return result
    } finally {
      actionPending.set(false)
    }
  }

  const ticketReset = async () => {
    const ticket = selectedTicket.get()
    if (!ticket || actionPending.get()) return
    actionPending.set(true)
    try {
      resultApply(await dataSource.ticketReset(inputs.eventKey(), ticket.id, tokenRead()), "reset")
    } catch {
      resultApply({ success: false, errorMessage: text().actionFailed }, "reset")
    } finally {
      actionPending.set(false)
    }
  }

  const locale = () => (languageSignal.get() === "de" ? "de-DE" : "en-GB")
  const currency = (priceCents: number) =>
    new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR" }).format(priceCents / 100)
  const dateTime = (value: string | null) => {
    if (!value) return text().unknown
    return new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  }
  const elapsed = (milliseconds: number | null) => {
    if (milliseconds === null) return text().unknown
    const minutes = Math.floor(milliseconds / 60_000)
    const seconds = Math.floor((milliseconds % 60_000) / 1_000)
    return languageSignal.get() === "de" ? `${minutes} Min. ${seconds} Sek.` : `${minutes} min ${seconds} sec`
  }

  const scanner = organizerTicketScannerStateCreate({ text, scanCode: ticketCheckInCode })
  scannerFeedbackClear = scanner.scannerFeedbackClear

  return {
    event,
    tickets: tickets.get,
    selectedTicket: selectedTicket.get,
    selectedTicketId: selectedTicketId.get,
    search: search.get,
    text,
    loading: loading.get,
    actionPending: actionPending.get,
    errorMessage,
    successMessage,
    duplicateInfo: duplicateInfo.get,
    searchChange,
    ticketSelect,
    ticketCheckIn,
    ticketReset,
    currency,
    dateTime,
    elapsed,
    scannerActive: scanner.scannerActive,
    scannerStarting: scanner.scannerStarting,
    scannerCheckingIn: scanner.scannerCheckingIn,
    scannerErrorMessage: scanner.scannerErrorMessage,
    scannerOutcome: scanner.scannerOutcome,
    scannerVideoSet: scanner.scannerVideoSet,
    scannerStart: scanner.scannerStart,
    scannerStop: scanner.scannerStop,
    scannerCodeSimulate: scanner.scannerCodeSimulate,
    scannerPermissionDeniedSimulate: scanner.scannerPermissionDeniedSimulate,
  }
}

type DetailActionSuccess = { readonly code: "check-in" | "reset" }
type DetailActionError = { readonly code: DetailActionErrorCode }
type DetailActionErrorCode =
  | "load"
  | "action-failed"
  | "organizer.check-in.duplicate"
  | "organizer.check-in.unpaid"
  | "organizer.check-in.cancelled"
  | "organizer.check-in.not-checked-in"
  | "organizer.check-in.unauthorized"
  | "organizer.check-in.wrong-event"
  | "organizer.check-in.unknown-ticket"

function actionErrorCodeRead(code: string | undefined): DetailActionErrorCode {
  if (
    code === "organizer.check-in.duplicate" ||
    code === "organizer.check-in.unpaid" ||
    code === "organizer.check-in.cancelled" ||
    code === "organizer.check-in.not-checked-in" ||
    code === "organizer.check-in.unauthorized" ||
    code === "organizer.check-in.wrong-event" ||
    code === "organizer.check-in.unknown-ticket"
  ) {
    return code
  }
  return "action-failed"
}

function errorText(code: DetailActionErrorCode, text: ReturnType<typeof organizerTextGet>): string {
  if (code === "organizer.check-in.duplicate") return text.duplicateTitle
  if (code === "organizer.check-in.unpaid") return text.unpaid
  if (code === "organizer.check-in.cancelled") return text.cancelled
  if (code === "organizer.check-in.not-checked-in") return text.notCheckedIn
  if (code === "organizer.check-in.unauthorized") return text.unauthorized
  if (code === "organizer.check-in.wrong-event") return text.wrongEvent
  if (code === "organizer.check-in.unknown-ticket") return text.unknownTicket
  return text.actionFailed
}
