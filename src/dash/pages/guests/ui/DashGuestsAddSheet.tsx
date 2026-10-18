import { For, Show } from "solid-js"
import { mdiMinus } from "@adaptive-ds/mdi/mdiMinus.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DashField } from "../../../ui/layout/DashField.tsx"
import type { DashGuestQuota } from "../../../model/dashGuestQuotaSchema.ts"
import { dashGuestAdd } from "../../../store/actions/guests/dashGuestAdd.ts"
import { dashGuestBulkAdd } from "../../../store/actions/guests/dashGuestBulkAdd.ts"
import { dashGuestBulkParse } from "../model/dashGuestBulkParse.ts"
import type { DashGuestsState } from "../DashGuestsStateCreate.ts"

/** Sheet „Gäste hinzufügen“: Tabs Einzeln/Mehrere mit Kontingent, Stepper, Toggle, Live-Zähler. */
export function DashGuestsAddSheet(p: {
  open: boolean
  onClose: () => void
  eventId: string
  quotas: DashGuestQuota[]
  usedByQuota: Map<string, number>
  state: DashGuestsState
}) {
  const single = p.state.single
  const tab = () => p.state.tab.get()

  const quotaOptions = () => ["", ...p.quotas.map((quota) => quota.id)]
  const quotaLabel = (id: string) => {
    if (id === "") return "Ohne Kontingent"
    const quota = p.quotas.find((candidate) => candidate.id === id)
    if (!quota) return "Ohne Kontingent"
    const used = p.usedByQuota.get(quota.id) ?? 0
    return `${quota.name} (${used}/${quota.limit})`
  }
  const bulkQuotaOptions = () => ["", ...p.quotas.map((quota) => quota.id)]

  const selectedQuotaFull = () => {
    const id = single.quotaId.get()
    if (id === "") return false
    const quota = p.quotas.find((candidate) => candidate.id === id)
    if (!quota) return false
    const used = p.usedByQuota.get(quota.id) ?? 0
    return used + 1 + single.plusOnes.get() > quota.limit
  }

  const singleErrors = () => {
    const messages: { name?: string; email?: string } = {}
    if (single.name.get().trim() === "") messages.name = "Bitte gib einen Namen an."
    const email = single.email.get().trim()
    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) messages.email = "Diese E-Mail-Adresse ist ungültig."
    if (single.sendTicket.get() && email === "")
      messages.email = "Zum Versenden des Tickets braucht der Gast eine E-Mail-Adresse."
    return messages
  }

  const saveSingle = () => {
    single.showErrors.set(true)
    const current = singleErrors()
    if (current.name ?? current.email) {
      toastAdd({ title: current.name ?? current.email ?? "Bitte prüfe die Felder", variant: "error" })
      return
    }
    if (selectedQuotaFull()) {
      toastAdd({ title: "Dieses Kontingent ist voll.", variant: "error" })
      return
    }
    const quotaId = single.quotaId.get()
    const result = dashGuestAdd({
      eventId: p.eventId,
      quotaId: quotaId === "" ? null : quotaId,
      name: single.name.get().trim(),
      email: single.email.get().trim(),
      plusOnes: single.plusOnes.get(),
      note: single.note.get().trim(),
      sendTicket: single.sendTicket.get(),
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Gast „${result.data.name}“ hinzugefügt`, variant: "success" })
    single.name.set("")
    single.email.set("")
    single.plusOnes.set(0)
    single.note.set("")
    single.showErrors.set(false)
    p.onClose()
  }

  const bulk = () => dashGuestBulkParse(p.state.bulkText.get())
  const bulkQuotaId = () => {
    const id = p.state.bulkQuotaId.get()
    return id === "" ? null : id
  }

  const saveBulk = () => {
    const parsed = bulk()
    if (parsed.entries.length === 0) {
      toastAdd({ title: parsed.errors[0] ?? "Es gibt nichts zu importieren.", variant: "error" })
      return
    }
    const result = dashGuestBulkAdd({
      eventId: p.eventId,
      quotaId: bulkQuotaId(),
      entries: parsed.entries,
      sendTicket: p.state.bulkSend.get(),
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    const suffix = result.data.errors.length > 0 ? ` · ${result.data.errors.length} übersprungen` : ""
    toastAdd({
      title: `${result.data.added} ${result.data.added === 1 ? "Gast" : "Gäste"} hinzugefügt${suffix}`,
      variant: "success",
    })
    p.state.bulkText.set("")
    p.onClose()
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.onClose()
      }}
      title="Gäste hinzufügen"
      description="Einzeln oder mehrere Zeilen auf einmal – mit oder ohne Ticket per E-Mail."
      size="lg"
      footer={
        <div class="ms-auto flex gap-2">
          <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={p.onClose}>
            Abbrechen
          </Button>
          <Show when={tab() === "einzeln"}>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={saveSingle}>
              Gast hinzufügen
            </Button>
          </Show>
          <Show when={tab() === "mehrere"}>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={saveBulk}>
              {bulk().entries.length} {bulk().entries.length === 1 ? "Gast" : "Gäste"} übernehmen
            </Button>
          </Show>
        </div>
      }
    >
      <div class="flex flex-col gap-4">
        <TabNav
          items={[
            { id: "einzeln", label: "Einzeln" },
            { id: "mehrere", label: "Mehrere" },
          ]}
          active={tab()}
          onSelect={(id) => p.state.tab.set(id === "mehrere" ? "mehrere" : "einzeln")}
          ariaLabel="Gäste hinzufügen"
        />
        <Show when={tab() === "einzeln"}>
          <div class="flex flex-col gap-4">
            <DashField
              label="Name"
              for="dash-guest-name"
              required
              error={single.showErrors.get() ? singleErrors().name : undefined}
            >
              <Input
                id="dash-guest-name"
                class="h-10 text-sm rounded-control"
                value={single.name.get()}
                onInput={(event) => single.name.set(event.currentTarget.value)}
                placeholder="z. B. Mara Lindner"
              />
            </DashField>
            <DashField
              label="E-Mail"
              for="dash-guest-email"
              error={single.showErrors.get() ? singleErrors().email : undefined}
            >
              <Input
                id="dash-guest-email"
                type="email"
                class="h-10 text-sm rounded-control"
                value={single.email.get()}
                onInput={(event) => single.email.set(event.currentTarget.value)}
                placeholder="mara@example.de"
              />
            </DashField>
            <DashField label="Kontingent" for="dash-guest-quota">
              <SelectSingleNative
                id="dash-guest-quota"
                valueSignal={single.quotaId as never}
                getOptions={() => quotaOptions()}
                valueText={(id) => quotaLabel(id)}
              />
            </DashField>
            <Show when={selectedQuotaFull()}>
              <p role="alert" class="text-xs text-danger">
                Dieses Kontingent ist voll – wähle ein anderes oder lege ein neues an.
              </p>
            </Show>
            <DashField label="Begleitpersonen">
              <div class="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  class="h-9 w-9 px-0 text-sm"
                  aria-label="Begleitperson entfernen"
                  disabled={single.plusOnes.get() <= 0}
                  onClick={() => single.plusOnes.set(Math.max(0, single.plusOnes.get() - 1))}
                >
                  <Icon path={mdiMinus} class="size-4" />
                </Button>
                <span class="min-w-16 text-center text-sm tabular-nums" aria-live="polite">
                  +{single.plusOnes.get()}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  class="h-9 w-9 px-0 text-sm"
                  aria-label="Begleitperson hinzufügen"
                  disabled={single.plusOnes.get() >= 5}
                  onClick={() => single.plusOnes.set(Math.min(5, single.plusOnes.get() + 1))}
                >
                  <Icon path={mdiPlus} class="size-4" />
                </Button>
                <span class="text-xs text-content-muted">0 bis +5</span>
              </div>
            </DashField>
            <DashField label="Notiz" for="dash-guest-note">
              <Textarea
                id="dash-guest-note"
                class="text-sm rounded-control"
                rows={2}
                value={single.note.get()}
                onInput={(event) => single.note.set(event.currentTarget.value)}
                placeholder="z. B. Interview vor der Show"
              />
            </DashField>
            <ToggleSwitch
              checked={single.sendTicket.get()}
              onChange={(checked) => single.sendTicket.set(checked)}
              label="Ticket per E-Mail senden"
              description="Legt eine kostenlose 0-€-Bestellung mit Ticket an"
            />
          </div>
        </Show>
        <Show when={tab() === "mehrere"}>
          <div class="flex flex-col gap-4">
            <DashField label="Kontingent" for="dash-guest-bulk-quota">
              <SelectSingleNative
                id="dash-guest-bulk-quota"
                valueSignal={p.state.bulkQuotaId as never}
                getOptions={() => bulkQuotaOptions()}
                valueText={(id) => quotaLabel(id)}
              />
            </DashField>
            <DashField
              label="Gäste (eine Zeile je Gast)"
              for="dash-guest-bulk-text"
              hint="Format: Name, E-Mail oder Name"
            >
              <Textarea
                id="dash-guest-bulk-text"
                class="font-mono text-sm rounded-control"
                rows={8}
                value={p.state.bulkText.get()}
                onInput={(event) => p.state.bulkText.set(event.currentTarget.value)}
                placeholder={"Mara Lindner, mara@example.de\nBen Clark\nCaro, caro@example.de"}
              />
            </DashField>
            <p class="text-sm text-content-muted" aria-live="polite">
              {bulk().entries.length} erkannt · {bulk().errors.length} Fehler
            </p>
            <Show when={bulk().errors.length > 0}>
              <ul class="flex flex-col gap-1 rounded-control border border-border-subtle bg-surface-muted p-3 text-xs text-danger">
                <For each={bulk().errors.slice(0, 8)}>{(error) => <li>{error}</li>}</For>
                <Show when={bulk().errors.length > 8}>
                  <li>… und {bulk().errors.length - 8} weitere</li>
                </Show>
              </ul>
            </Show>
            <ToggleSwitch
              checked={p.state.bulkSend.get()}
              onChange={(checked) => p.state.bulkSend.set(checked)}
              label="Tickets per E-Mail senden"
              description="Braucht je Gast eine E-Mail-Adresse – Zeilen ohne Adresse werden übersprungen"
            />
          </div>
        </Show>
      </div>
    </Sheet>
  )
}
