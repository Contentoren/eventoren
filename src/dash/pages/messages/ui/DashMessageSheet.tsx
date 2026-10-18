import { mdiAlertOutline } from "@adaptive-ds/mdi/mdiAlertOutline.js"
import { mdiCalendarClockOutline } from "@adaptive-ds/mdi/mdiCalendarClockOutline.js"
import { mdiDeleteOutline } from "@adaptive-ds/mdi/mdiDeleteOutline.js"
import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiSendOutline } from "@adaptive-ds/mdi/mdiSendOutline.js"
import { For, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { DropdownMenu, type DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashMessageAudienceType } from "../../../model/dashMessageAudienceTypeSchema.ts"
import type { DashMessageKind } from "../../../model/dashMessageKindSchema.ts"
import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMarkdown } from "../../../ui/markdown/DashMarkdown.tsx"
import { DashMarkdownEditor } from "../../../ui/markdown/DashMarkdownEditor.tsx"
import type { DashMessagesState } from "../DashMessagesStateCreate.ts"
import { dashMessageKindLabel } from "../dashMessagesText.ts"
import { dashMessageSheetPlaceholders } from "../model/dashMessageSheetPlaceholders.ts"
import { dashMessageSheetTemplates } from "../model/dashMessageSheetTemplates.ts"
import { dashMessageSheetStateCreate } from "./dashMessageSheetStateCreate.ts"

/** Composer-Sheet (?nachricht=neu|<id>): Vorlage, Empfänger, Betreff, Markdown, Live-Vorschau. */
export function DashMessageSheet(p: {
  open: boolean
  event: DashEvent
  existing: DashMessage | null
  types: DashTicketType[]
  state: DashMessagesState
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const state = dashMessageSheetStateCreate({
    open: () => p.open,
    event: () => p.event,
    existing: () => p.existing,
    state: () => p.state,
    onClose: () => p.onClose(),
    onSaved: (id) => p.onSaved(id),
  })

  const audienceOptions: Array<{ value: DashMessageAudienceType; label: string }> = [
    { value: "alle", label: "Alle" },
    { value: "ticketarten", label: "Ticketarten" },
    { value: "eingecheckt", label: "Eingecheckt" },
    { value: "nicht-eingecheckt", label: "Nicht eingecheckt" },
  ]

  const moreItems = (): DropdownMenuEntry[] => {
    const entries: DropdownMenuEntry[] = [
      { type: "item", id: "test", label: "Test an mich", icon: mdiEmailOutline, onSelect: state.sendTest },
      { type: "item", id: "planen", label: "Planen", icon: mdiCalendarClockOutline, onSelect: state.openPlan },
    ]
    if (p.existing && p.existing.status !== "gesendet") {
      entries.push({ type: "separator" })
      entries.push({
        type: "item",
        id: "loeschen",
        label: "Löschen",
        icon: mdiDeleteOutline,
        tone: "danger",
        onSelect: state.requestDelete,
      })
    }
    return entries
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.onClose()
      }}
      title={p.existing ? `Nachricht „${p.existing.subject}“` : "Nachricht schreiben"}
      description={state.isSent() ? "Gesendet – nur lesen." : "Vorlage, Empfänger, Text und Vorschau."}
      size="xl"
      footer={
        <Show
          when={!state.isSent()}
          fallback={
            <div class="flex w-full justify-end">
              <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={p.onClose}>
                Schließen
              </Button>
            </div>
          }
        >
          <div class="flex w-full flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={state.saveDraft}>
              Als Entwurf speichern
            </Button>
            <div class="ms-auto flex flex-wrap items-center gap-2">
              <DropdownMenu items={moreItems()} triggerIcon={mdiDotsHorizontal} triggerAriaLabel="Weitere Aktionen" />
              <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={state.sendNow}>
                <Icon path={mdiSendOutline} class="size-4" />
                Jetzt senden
              </Button>
            </div>
          </div>
        </Show>
      }
    >
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-4">
          <DashField label="Vorlage">
            <div class="flex flex-wrap gap-2">
              <For each={Object.keys(dashMessageSheetTemplates) as DashMessageKind[]}>
                {(kind) => (
                  <FilterChip active={p.state.kind.get() === kind} onClick={() => state.applyTemplate(kind)}>
                    {dashMessageKindLabel(kind)}
                  </FilterChip>
                )}
              </For>
            </div>
          </DashField>
          <Show when={p.state.kind.get() === "absage" && !state.isSent()}>
            <div class="flex items-start gap-2 rounded-card border border-border-subtle bg-surface-muted/40 p-3 text-sm">
              <Icon path={mdiAlertOutline} class="mt-0.5 size-4 shrink-0" />
              <span>
                Eine Absage informiert alle Ticketinhaber. Für eine echte Event-Absage nutze zusätzlich den
                Absage-Dialog in der Event-Übersicht – dort wird der Status umgestellt.
              </span>
            </div>
          </Show>
          <DashField label="Empfänger" hint={`${state.liveCount()} Empfänger`}>
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap gap-2">
                <For each={audienceOptions}>
                  {(option) => (
                    <FilterChip
                      active={p.state.audienceType.get() === option.value}
                      onClick={() => state.audienceTypeSelect(option.value)}
                      count={state.audienceCount(option.value)}
                    >
                      {option.label}
                    </FilterChip>
                  )}
                </For>
              </div>
              <Show when={p.state.audienceType.get() === "ticketarten" && !state.isReadonly()}>
                <div class="flex flex-col gap-1.5">
                  <For each={p.types}>
                    {(type) => (
                      <Checkbox
                        checked={p.state.ticketTypeIds.get().includes(type.id)}
                        onChange={() => state.toggleTicketType(type.id)}
                        aria-label={type.name}
                        disabled={state.isReadonly()}
                      >
                        <span class="text-sm">{type.name}</span>
                      </Checkbox>
                    )}
                  </For>
                </div>
              </Show>
              <p class="text-sm font-medium text-content" aria-live="polite">
                {state.liveCount()} Empfänger
              </p>
            </div>
          </DashField>
          <DashField label="Betreff" for="dash-message-subject" required error={state.subjectError()}>
            <Input
              id="dash-message-subject"
              class="h-10 text-sm rounded-control"
              value={p.state.subject.get()}
              onInput={(event) => p.state.subject.set(event.currentTarget.value)}
              placeholder="Betreff der E-Mail"
              disabled={state.isReadonly()}
              aria-invalid={state.subjectError() !== null}
            />
          </DashField>
          <DashField label="Text" hint="Markdown wird unterstützt" required error={state.bodyError()}>
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap gap-2">
                <For each={dashMessageSheetPlaceholders()}>
                  {(token) => (
                    <Button
                      type="button"
                      variant="outline"
                      class="h-9 px-3 text-sm font-mono"
                      onClick={() => state.insertPlaceholder(token)}
                      disabled={state.isReadonly()}
                    >
                      {token}
                    </Button>
                  )}
                </For>
              </div>
              <Show
                when={!state.isSent()}
                fallback={<Textarea value={p.state.body.get()} rows={8} disabled aria-label="Text" />}
              >
                <DashMarkdownEditor value={p.state.body.get()} onChange={(value) => p.state.body.set(value)} rows={8} />
              </Show>
            </div>
          </DashField>
        </div>
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-sm font-medium text-content">Live-Vorschau</p>
          <div class="rounded-card border border-border-subtle bg-surface-muted/40 p-4">
            <p class="text-base font-semibold text-content">{p.state.subject.get() || "Betreff"}</p>
            <p class="mt-1 text-sm text-content-muted">
              {p.event.title} · {dashDateFormat(p.event.startsAt, "kurz")} · {state.liveCount()} Empfänger
            </p>
            <div class="mt-3 border-t border-border-subtle pt-3 text-sm text-content">
              <DashMarkdown text={state.previewBody()} />
            </div>
          </div>
        </div>
      </div>
      <ModalDialog
        nested
        open={p.state.planOpen.get()}
        onOpenChange={(open) => {
          if (!open) state.closePlan()
        }}
        size="sm"
        title="Nachricht planen"
        description="Datum und Uhrzeit wählen – die Nachricht wird dann automatisch gesendet."
        footer={
          <div class="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={state.closePlan}>
              Abbrechen
            </Button>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={state.plan}>
              <Icon path={mdiCalendarClockOutline} class="size-4" />
              Planen
            </Button>
          </div>
        }
      >
        <DashDateTimeInput
          valueIso={p.state.planValue.get()}
          onChange={(iso) => p.state.planValue.set(iso)}
          disabled={state.isReadonly()}
        />
      </ModalDialog>
      <ConfirmDialog
        open={p.state.sendConfirmOpen.get()}
        onOpenChange={(open) => {
          if (!open) state.closeSendConfirm()
        }}
        title="Nachricht jetzt senden?"
        description={`„${p.state.subject.get() || "Ohne Betreff"}“ an ${state.liveCount()} Empfänger senden. Das kann nicht rückgängig gemacht werden.`}
        confirmLabel="Jetzt senden"
        onConfirm={state.sendConfirm}
      />
    </Sheet>
  )
}
