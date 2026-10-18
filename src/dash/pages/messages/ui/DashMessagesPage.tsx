import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import { dashMessageDelete } from "../../../store/actions/messages/dashMessageDelete.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { DashMessagesStateCreate } from "../DashMessagesStateCreate.ts"
import { dashMessageSheetFill } from "../model/dashMessageSheetFill.ts"
import { DashMessageSheet } from "./DashMessageSheet.tsx"
import { DashMessagesList } from "./DashMessagesList.tsx"
import { DashReminderCard } from "./DashReminderCard.tsx"

export type DashMessagesSearch = {
  nachricht: string | undefined
  absagen: boolean
}

/** Seite „Nachrichten“: Erinnerung oben, Liste, Composer-Sheet. */
export function DashMessagesPage(p: { eventId: string; search: DashMessagesSearch }) {
  const navigate = useNavigate()
  const state = DashMessagesStateCreate()

  const event = (): DashEvent | null => dashStateGet().events.find((candidate) => candidate.id === p.eventId) ?? null
  const canSend = () => dashCan("nachrichten.senden")
  const messages = () =>
    dashStateGet()
      .messages.filter((message) => message.eventId === p.eventId)
      .sort((a, b) => (b.sentAt ?? b.scheduledAt ?? "").localeCompare(a.sentAt ?? a.scheduledAt ?? ""))
  const types = () =>
    dashStateGet()
      .ticketTypes.filter((type) => type.eventId === p.eventId)
      .sort((a, b) => a.sortOrder - b.sortOrder)

  const selectedId = () => p.search.nachricht
  const selected = () => {
    const id = selectedId()
    if (!id || id === "neu") return null
    return dashStateGet().messages.find((message) => message.id === id && message.eventId === p.eventId) ?? null
  }
  const sheetOpen = () => {
    if (!canSend()) return false
    const id = selectedId()
    return id !== undefined && (id === "neu" || selected() !== null)
  }

  const closeSheet = () => {
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/nachrichten` as never,
      search: {} as never,
      replace: false,
      resetScroll: false,
    })
  }

  const openNew = () => {
    dashMessageSheetFill(state, null)
    void navigate({
      to: `/demo/dashboard/events/${p.eventId}/nachrichten` as never,
      search: { nachricht: "neu" } as never,
      replace: false,
      resetScroll: false,
    })
  }

  const deleteConfirm = () => {
    const id = state.deleteId.get()
    if (!id) return
    const result = dashMessageDelete(id)
    state.deleteId.set(null)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else {
      toastAdd({ title: "Nachricht gelöscht", variant: "success" })
      closeSheet()
    }
  }

  return (
    <div>
      <Show when={event()}>
        {(current) => (
          <>
            <DashPageHeader
              title="Nachrichten"
              description="Infos an deine Ticketinhaber – plus automatische Erinnerung."
              actions={
                <Show when={canSend()}>
                  <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={openNew}>
                    <Icon path={mdiPlus} class="size-4" />
                    Nachricht schreiben
                  </Button>
                </Show>
              }
            />
            <Show
              when={canSend()}
              fallback={<DashLockedState description="Nachrichten schreiben nur Rollen mit Zugriff auf Nachrichten." />}
            >
              <div class="flex flex-col gap-4">
                <DashReminderCard event={current()} state={state} />
                <DashMessagesList
                  rows={messages()}
                  onSelect={(row) => {
                    dashMessageSheetFill(state, row)
                    void navigate({
                      to: `/demo/dashboard/events/${p.eventId}/nachrichten` as never,
                      search: { nachricht: row.id } as never,
                      replace: false,
                      resetScroll: false,
                    })
                  }}
                  empty="Schreibe deine erste Nachricht an die Ticketinhaber."
                />
              </div>
            </Show>
            <Show when={sheetOpen()}>
              <DashMessageSheet
                open
                event={current()}
                existing={selected()}
                types={types()}
                state={state}
                onClose={closeSheet}
                onSaved={(id) => {
                  void navigate({
                    to: `/demo/dashboard/events/${p.eventId}/nachrichten` as never,
                    search: { nachricht: id } as never,
                    replace: true,
                    resetScroll: false,
                  })
                }}
              />
            </Show>
            <ConfirmDialog
              open={state.deleteId.get() !== null}
              onOpenChange={(open) => {
                if (!open) state.deleteId.set(null)
              }}
              title="Nachricht löschen?"
              description="Entwurf oder geplante Nachricht wird endgültig entfernt."
              confirmLabel="Löschen"
              tone="danger"
              onConfirm={deleteConfirm}
            />
          </>
        )}
      </Show>
    </div>
  )
}
