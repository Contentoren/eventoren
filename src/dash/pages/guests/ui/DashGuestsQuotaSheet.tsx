import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DashField } from "../../../ui/layout/DashField.tsx"
import type { DashGuestQuota } from "../../../model/dashGuestQuotaSchema.ts"
import { dashGuestQuotaDelete } from "../../../store/actions/guests/dashGuestQuotaDelete.ts"
import { dashGuestQuotaUpsert } from "../../../store/actions/guests/dashGuestQuotaUpsert.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import type { DashGuestsState } from "../DashGuestsStateCreate.ts"

/** Sheet „Kontingent“: Name + Limit anlegen/bearbeiten, Löschen mit Bestätigung. */
export function DashGuestsQuotaSheet(p: {
  open: boolean
  onClose: () => void
  eventId: string
  state: DashGuestsState
}) {
  const form = p.state.quota
  const editingId = () => p.state.editingQuotaId.get()
  const editingQuota = (): DashGuestQuota | null => {
    const id = editingId()
    if (!id) return null
    return dashStateGet().guestQuotas.find((quota) => quota.id === id) ?? null
  }

  const errors = () => {
    const messages: { name?: string; limit?: string } = {}
    if (form.name.get().trim() === "") messages.name = "Bitte gib einen Namen an."
    const raw = form.limit.get().trim()
    const parsed = raw === "" ? Number.NaN : Number(raw)
    if (raw === "" || !Number.isInteger(parsed) || parsed < 0)
      messages.limit = "Das Limit muss eine ganze Zahl ab 0 sein."
    return messages
  }

  const save = () => {
    form.showErrors.set(true)
    const current = errors()
    if (current.name ?? current.limit) {
      toastAdd({ title: current.name ?? current.limit ?? "Bitte prüfe die Felder", variant: "error" })
      return
    }
    const id = editingId()
    const result = dashGuestQuotaUpsert({
      ...(id ? { id } : {}),
      eventId: p.eventId,
      name: form.name.get().trim(),
      limit: Number(form.limit.get().trim()),
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: id ? "Kontingent gespeichert" : "Kontingent angelegt", variant: "success" })
    p.onClose()
  }

  const remove = () => {
    const quota = editingQuota()
    if (!quota) return
    const result = dashGuestQuotaDelete(quota.id)
    form.confirmDelete.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Kontingent „${quota.name}“ gelöscht`, variant: "success" })
    p.onClose()
  }

  return (
    <>
      <Sheet
        open={p.open}
        onOpenChange={(open) => {
          if (!open) p.onClose()
        }}
        title={editingId() ? "Kontingent bearbeiten" : "Kontingent hinzufügen"}
        description="Name und Limit festlegen – das Limit darf nicht unter den belegten Plätzen liegen."
        footer={
          <div class="flex w-full items-center justify-between gap-2">
            <Show when={editingId() !== null}>
              <Button
                type="button"
                variant="outline"
                class="h-9 px-3 text-sm"
                onClick={() => form.confirmDelete.set(true)}
              >
                Löschen
              </Button>
            </Show>
            <div class="ms-auto flex gap-2">
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={p.onClose}>
                Abbrechen
              </Button>
              <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={save}>
                Speichern
              </Button>
            </div>
          </div>
        }
      >
        <div class="flex flex-col gap-4">
          <DashField
            label="Name"
            for="dash-guest-quota-name"
            required
            error={form.showErrors.get() ? errors().name : undefined}
          >
            <Input
              id="dash-guest-quota-name"
              class="h-10 text-sm rounded-control"
              value={form.name.get()}
              onInput={(event) => form.name.set(event.currentTarget.value)}
              placeholder="z. B. Presse"
            />
          </DashField>
          <DashField
            label="Limit"
            for="dash-guest-quota-limit"
            required
            error={form.showErrors.get() ? errors().limit : undefined}
          >
            <Input
              id="dash-guest-quota-limit"
              type="number"
              min={0}
              step={1}
              class="h-10 text-sm rounded-control tabular-nums"
              value={form.limit.get()}
              onInput={(event) => form.limit.set(event.currentTarget.value)}
              placeholder="20"
            />
          </DashField>
        </div>
      </Sheet>
      <ConfirmDialog
        open={form.confirmDelete.get()}
        onOpenChange={(open) => form.confirmDelete.set(open)}
        title="Kontingent löschen?"
        description="Das Kontingent wird endgültig entfernt. Das geht nur, wenn keine Gäste mehr zugeordnet sind."
        confirmLabel="Löschen"
        tone="danger"
        onConfirm={remove}
      />
    </>
  )
}
