import { Show } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { UiDialog } from "../ui/UiDialog.tsx"
import { ticketWalletDialogStateCreate } from "./ticketWalletDialogStateCreate.ts"

export function TicketWalletDialog(props: {
  walletType?: "apple" | "google" | string | null | (() => "apple" | "google" | string | null | undefined)
  onClose: () => void
  ticket?:
    | {
        id?: string
        code?: string
        title?: string
        participantName?: string
        tierName?: string
        sequence?: number
      }
    | null
    | (() =>
        | {
            id?: string
            code?: string
            title?: string
            participantName?: string
            tierName?: string
            sequence?: number
          }
        | null
        | undefined)
  eventTitle: string | (() => string)
}) {
  const resolve = <T,>(val: T | (() => T)): T => (typeof val === "function" ? (val as () => T)() : val)

  const state = ticketWalletDialogStateCreate({
    walletType: () => resolve(props.walletType),
    onClose: () => props.onClose(),
    ticket: () => {
      const ticketVal = resolve(props.ticket)
      if (!ticketVal) return null
      return {
        id: ticketVal.id,
        code: ticketVal.code,
        title:
          ticketVal.title ??
          (ticketVal.tierName ? `Ticket ${ticketVal.sequence ?? ""} · ${ticketVal.tierName}` : undefined),
        participantName: ticketVal.participantName,
      }
    },
    eventTitle: () => resolve(props.eventTitle),
  })

  return (
    <UiDialog open={state.isOpen()} onClose={state.handleClose} title={state.dialogTitle()}>
      <div class="flex flex-col gap-space-5">
        <div class="rounded-control border border-border-subtle bg-surface-muted p-space-4">
          <dl class="grid grid-cols-1 gap-space-3 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Veranstaltung</dt>
              <dd class="mt-space-1 text-sm font-medium text-content">{state.eventTitle()}</dd>
            </div>
            <Show when={state.ticketTitle()}>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Ticket</dt>
                <dd class="mt-space-1 text-sm font-medium text-content">{state.ticketTitle()}</dd>
              </div>
            </Show>
            <Show when={state.participantName()}>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Teilnehmer:in</dt>
                <dd class="mt-space-1 text-sm font-medium text-content">{state.participantName()}</dd>
              </div>
            </Show>
            <Show when={state.ticketCode()}>
              <div>
                <dt class="text-xs font-medium uppercase tracking-wide text-content-muted">Ticket-Code</dt>
                <dd class="mt-space-1 font-mono text-xs font-medium text-content">{state.ticketCode()}</dd>
              </div>
            </Show>
          </dl>
        </div>

        <div class="rounded-control border border-border-subtle bg-surface-muted/60 p-space-4 text-sm">
          <div class="flex items-start gap-space-3">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              class="mt-0.5 size-5 shrink-0 text-brand-accent"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="flex flex-col gap-space-1 leading-relaxed">
              <p class="font-medium text-content">Native {state.walletName()}-Bereitstellung</p>
              <p class="text-xs leading-relaxed text-content-muted">
                Das direkte Speichern in {state.walletName()} erfordert ein kryptografisch signiertes Pass-Bundle über
                unsere Backend-Schnittstelle. In der Zwischenzeit kannst du dein Ticket jederzeit über den angezeigten
                QR-Code auf deinem Bildschirm vorweisen oder ausgedruckt mitbringen.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-space-2">
          <UiButton variant="secondary" onClick={state.handleClose}>
            Schließen
          </UiButton>
        </div>
      </div>
    </UiDialog>
  )
}
