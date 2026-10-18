import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiDiceMultipleOutline } from "@adaptive-ds/mdi/mdiDiceMultipleOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashCode } from "../../../model/dashCodeSchema.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashCodeGenerate } from "../../../model/dashCodeGenerate.ts"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashCodeUsageText, dashCodeValidityText, dashCodeValueText } from "../dashCodeText.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { dashMoneyParse } from "../../../ui/form/dashMoneyParse.ts"
import { dashCodeUpsert } from "../../../store/actions/codes/dashCodeUpsert.ts"
import { dashCodeDelete } from "../../../store/actions/codes/dashCodeDelete.ts"

export type DashCodeSheetState = {
  code: ReturnType<typeof createSignalObject<string>>
  kind: ReturnType<typeof createSignalObject<"rabatt" | "zugang">>
  discountType: ReturnType<typeof createSignalObject<"prozent" | "betrag">>
  percentText: ReturnType<typeof createSignalObject<string>>
  amountCents: ReturnType<typeof createSignalObject<number | null>>
  freischaltung: ReturnType<typeof createSignalObject<string[]>>
  giltFuer: ReturnType<typeof createSignalObject<string[]>>
  maxTickets: ReturnType<typeof createSignalObject<string>>
  validFrom: ReturnType<typeof createSignalObject<string | null>>
  validUntil: ReturnType<typeof createSignalObject<string | null>>
  active: ReturnType<typeof createSignalObject<boolean>>
  note: ReturnType<typeof createSignalObject<string>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
  confirmOpen: ReturnType<typeof createSignalObject<boolean>>
}

function dashCodeSheetDiscountText(code: DashCode | null): string {
  if (!code?.discount) return ""
  if (code.discount.type === "prozent") return String(code.discount.value / 100).replace(".", ",")
  return dashCentsFormat(code.discount.value).replace(" €", "")
}

/** Sheet-State für einen Code: Felder vorbelegen oder leer starten. */
export function DashCodeSheetStateCreate(existing: DashCode | null): DashCodeSheetState {
  return {
    code: createSignalObject(existing?.code ?? ""),
    kind: createSignalObject<"rabatt" | "zugang">(existing?.kind ?? "rabatt"),
    discountType: createSignalObject<"prozent" | "betrag">(existing?.discount?.type ?? "prozent"),
    percentText: createSignalObject(
      existing?.discount?.type === "prozent" ? String(existing.discount.value / 100).replace(".", ",") : "10",
    ),
    amountCents: createSignalObject<number | null>(
      existing?.discount?.type === "betrag" ? existing.discount.value : 500,
    ),
    freischaltung: createSignalObject<string[]>(existing?.kind === "zugang" ? [...existing.ticketTypeIds] : []),
    giltFuer: createSignalObject<string[]>(existing?.kind === "rabatt" ? [...existing.ticketTypeIds] : []),
    maxTickets: createSignalObject(
      existing?.maxTickets === null || existing?.maxTickets === undefined ? "" : String(existing.maxTickets),
    ),
    validFrom: createSignalObject<string | null>(existing?.validFrom ?? null),
    validUntil: createSignalObject<string | null>(existing?.validUntil ?? null),
    active: createSignalObject(existing?.active ?? true),
    note: createSignalObject(existing?.note ?? ""),
    showErrors: createSignalObject(false),
    confirmOpen: createSignalObject(false),
  }
}

/** Sheet „Code“ (?code=<id>|neu): Eingabe, Art, Rabatt/Zugang, Vorschau für dich als Käufer. */
export function DashCodeSheet(p: {
  open: boolean
  event: DashEvent
  existing: DashCode | null
  types: DashTicketType[]
  codes: DashCode[]
  canEdit: boolean
  state: DashCodeSheetState
}) {
  const navigate = useNavigate()
  const isNew = () => p.existing === null
  const [buyerCode, setBuyerCode] = createSignal("")

  createEffect(() => {
    void p.existing?.id
    setBuyerCode("")
  })

  const hiddenTypes = () =>
    p.types.filter((type) => type.hidden && type.archivedAt === null).sort((a, b) => a.sortOrder - b.sortOrder)
  const visibleTypes = () =>
    p.types.filter((type) => type.archivedAt === null).sort((a, b) => a.sortOrder - b.sortOrder)

  const enteredCode = () => p.state.code.get().trim().toUpperCase()

  const previewValue = createMemo((): string => {
    if (p.state.kind.get() === "zugang") {
      const names = p.state.freischaltung
        .get()
        .map((id) => p.types.find((type) => type.id === id)?.name)
        .filter((name): name is string => Boolean(name))
      return names.length > 0 ? `schaltet frei: ${names.join(", ")}` : "schaltet frei: Ticketart"
    }
    if (p.state.discountType.get() === "prozent") {
      const parsed = dashMoneyParse(p.state.percentText.get().replace("%", ""))
      if (parsed === null) return "10 % Rabatt"
      return `${(parsed / 100).toLocaleString("de-DE")} % Rabatt`
    }
    return `${dashCentsFormat(p.state.amountCents.get() ?? 0)} Rabatt`
  })

  const errors = createMemo((): string | null => {
    const code = enteredCode()
    if (!code) return "Bitte gib einen Code ein."
    if (!/^[A-Z0-9-]+$/.test(code)) return "Nur Großbuchstaben, Ziffern und Bindestriche."
    const clash = p.codes.find(
      (candidate) =>
        candidate.eventId === p.event.id && candidate.id !== p.existing?.id && candidate.code.toUpperCase() === code,
    )
    if (clash) return `„${code}“ gibt es schon.`
    if (p.state.kind.get() === "rabatt") {
      if (p.state.discountType.get() === "prozent") {
        const parsed = dashMoneyParse(p.state.percentText.get().replace("%", ""))
        if (parsed === null || parsed <= 0) return "Bitte gib einen Prozentwert über 0 ein."
        if (parsed > 10000) return "Maximal 100 %."
      } else if ((p.state.amountCents.get() ?? 0) <= 0) return "Bitte gib einen Betrag über 0 € ein."
    } else if (p.state.freischaltung.get().length === 0) return "Bitte wähle eine versteckte Ticketart."
    const from = p.state.validFrom.get()
    const until = p.state.validUntil.get()
    if (from && until && Date.parse(until) <= Date.parse(from)) return "„Gültig bis“ muss nach „Gültig von“ liegen."
    return null
  })

  const close = () => {
    void navigate({
      to: `/demo/dashboard/events/${p.event.id}/codes` as never,
      search: { art: p.existing?.kind === "zugang" ? "zugang" : "rabatt" } as never,
      replace: false,
      resetScroll: false,
    })
  }

  const randomize = () => {
    const taken = p.codes.filter((code) => code.eventId === p.event.id).map((code) => code.code)
    const [next] = dashCodeGenerate({
      count: 1,
      length: 6,
      existing: taken,
      random: dashRandomCreate(Date.now() + Math.floor(Math.random() * 1_000_000)),
    })
    if (next) p.state.code.set(next)
  }

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]

  const save = () => {
    p.state.showErrors.set(true)
    const error = errors()
    if (error) {
      toastAdd({ title: error, variant: "error" })
      return
    }
    const code = enteredCode()
    const kind = p.state.kind.get()
    const maxRaw = p.state.maxTickets.get().trim()
    const maxTickets = maxRaw === "" ? null : Number.parseInt(maxRaw, 10)
    const discount =
      kind === "rabatt"
        ? p.state.discountType.get() === "prozent"
          ? { type: "prozent" as const, value: dashMoneyParse(p.state.percentText.get().replace("%", "")) ?? 0 }
          : { type: "betrag" as const, value: p.state.amountCents.get() ?? 0 }
        : null
    const result = dashCodeUpsert({
      ...(p.existing ? { id: p.existing.id } : {}),
      eventId: p.event.id,
      kind,
      code,
      ticketTypeIds: kind === "zugang" ? p.state.freischaltung.get() : p.state.giltFuer.get(),
      maxTickets: Number.isInteger(maxTickets) && (maxTickets ?? 0) >= 1 ? (maxTickets as number) : null,
      validFrom: p.state.validFrom.get(),
      validUntil: p.state.validUntil.get(),
      active: p.state.active.get(),
      note: p.state.note.get(),
      discount,
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Code ${code} gespeichert`, variant: "success" })
    close()
  }

  const remove = () => {
    if (!p.existing) return
    if (p.existing.usedTickets > 0) {
      toastAdd({ title: "Der Code wurde schon genutzt und kann nicht gelöscht werden.", variant: "error" })
      return
    }
    const result = dashCodeDelete([p.existing.id])
    p.state.confirmOpen.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Code ${p.existing.code} gelöscht`, variant: "success" })
    close()
  }

  const toggleKind = (kind: "rabatt" | "zugang") => {
    p.state.kind.set(kind)
    if (kind === "zugang" && p.state.freischaltung.get().length === 0) {
      const first = hiddenTypes()[0]
      if (first) p.state.freischaltung.set([first.id])
    }
  }

  return (
    <>
      <Sheet
        open={p.open}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={isNew() ? "Code erstellen" : `Code „${p.existing?.code ?? ""}“`}
        description={isNew() ? "Rabatt- oder Zugangscode anlegen." : "Details, Gültigkeit und Vorschau."}
        size="lg"
        footer={
          <div class="flex w-full items-center justify-between gap-2">
            <Show when={!isNew() && (p.existing?.usedTickets ?? 0) === 0 && p.canEdit} fallback={<span />}>
              <Button
                type="button"
                variant="outline"
                class="h-9 px-3 text-sm"
                onClick={() => p.state.confirmOpen.set(true)}
              >
                Löschen
              </Button>
            </Show>
            <div class="ms-auto flex gap-2">
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={close}>
                Abbrechen
              </Button>
              <Show when={p.canEdit}>
                <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={save}>
                  Speichern
                </Button>
              </Show>
            </div>
          </div>
        }
      >
        <div class="flex flex-col gap-4">
          <DashField
            label="Code"
            for="dash-code-value"
            required
            error={p.state.showErrors.get() ? errors() : undefined}
          >
            <div class="flex gap-2">
              <Input
                id="dash-code-value"
                class="h-10 font-mono text-sm uppercase rounded-control"
                value={p.state.code.get()}
                onInput={(event) => p.state.code.set(event.currentTarget.value.toUpperCase())}
                placeholder="JAZZ10"
                disabled={!p.canEdit}
              />
              <Show when={p.canEdit}>
                <Button type="button" variant="outline" class="h-10 shrink-0 px-3 text-sm" onClick={randomize}>
                  <Icon path={mdiDiceMultipleOutline} class="size-4" />
                  Zufällig
                </Button>
              </Show>
            </div>
          </DashField>
          <DashField label="Art">
            <SegmentedControl
              value={p.state.kind.get()}
              onChange={(value) => toggleKind(value as "rabatt" | "zugang")}
              options={[
                { value: "rabatt", label: "Rabatt" },
                { value: "zugang", label: "Zugang" },
              ]}
              ariaLabel="Codeart"
            />
          </DashField>
          <Show when={p.state.kind.get() === "rabatt"}>
            <DashField label="Rabatt">
              <SegmentedControl
                value={p.state.discountType.get()}
                onChange={(value) => p.state.discountType.set(value as "prozent" | "betrag")}
                options={[
                  { value: "prozent", label: "Prozent" },
                  { value: "betrag", label: "Betrag" },
                ]}
                ariaLabel="Rabattart"
              />
            </DashField>
            <Show
              when={p.state.discountType.get() === "prozent"}
              fallback={
                <DashField label="Betrag je Ticket">
                  <DashMoneyInput
                    valueCents={p.state.amountCents.get()}
                    onChange={(cents) => p.state.amountCents.set(cents)}
                  />
                </DashField>
              }
            >
              <DashField label="Prozent" hint="z. B. 10">
                <div class="relative">
                  <Input
                    class="h-10 text-sm tabular-nums rounded-control pr-8"
                    inputmode="decimal"
                    value={p.state.percentText.get()}
                    onInput={(event) => p.state.percentText.set(event.currentTarget.value)}
                    placeholder={dashCodeSheetDiscountText(p.existing) || "10"}
                    disabled={!p.canEdit}
                  />
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-content-muted"
                  >
                    %
                  </span>
                </div>
              </DashField>
            </Show>
            <DashField label="Gilt für" hint="Leer lassen für alle Ticketarten">
              <div class="flex flex-col gap-1.5">
                <For each={visibleTypes()}>
                  {(type) => (
                    <label class="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={p.state.giltFuer.get().includes(type.id)}
                        onChange={() => p.state.giltFuer.set(toggleIn(p.state.giltFuer.get(), type.id))}
                        aria-label={type.name}
                      />
                      <span>{type.name}</span>
                    </label>
                  )}
                </For>
              </div>
            </DashField>
          </Show>
          <Show when={p.state.kind.get() === "zugang"}>
            <DashField
              label="Freischaltung"
              hint={
                hiddenTypes().length === 0
                  ? "Noch keine versteckte Ticketart vorhanden."
                  : "Schaltet versteckte Ticketarten im Checkout frei."
              }
            >
              <Show
                when={hiddenTypes().length > 0}
                fallback={
                  <LinkButtonInternal
                    to={`/demo/dashboard/events/${p.event.id}/tickets` as never}
                    variant="outline"
                    size="sm"
                    class="h-9 px-3 text-sm"
                  >
                    Ticketart verstecken
                  </LinkButtonInternal>
                }
              >
                <div class="flex flex-col gap-1.5">
                  <For each={hiddenTypes()}>
                    {(type) => (
                      <label class="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={p.state.freischaltung.get().includes(type.id)}
                          onChange={() => p.state.freischaltung.set(toggleIn(p.state.freischaltung.get(), type.id))}
                          aria-label={type.name}
                        />
                        <span>{type.name}</span>
                      </label>
                    )}
                  </For>
                </div>
              </Show>
            </DashField>
          </Show>
          <DashField label="Max. Tickets gesamt" hint="Leer lassen für unbegrenzt">
            <Input
              class="h-10 text-sm rounded-control"
              inputmode="numeric"
              value={p.state.maxTickets.get()}
              onInput={(event) => p.state.maxTickets.set(event.currentTarget.value.replace(/[^0-9]/g, ""))}
              placeholder="Unbegrenzt"
              disabled={!p.canEdit}
            />
          </DashField>
          <div class="grid grid-cols-1 gap-4">
            <DashField label="Gültig von" hint="Leer lassen für sofort">
              <DashDateTimeInput valueIso={p.state.validFrom.get()} onChange={(iso) => p.state.validFrom.set(iso)} />
            </DashField>
            <DashField label="Gültig bis" hint="Leer lassen für unbegrenzt">
              <DashDateTimeInput
                valueIso={p.state.validUntil.get()}
                onChange={(iso) => p.state.validUntil.set(iso)}
                min={p.state.validFrom.get()}
              />
            </DashField>
          </div>
          <DashField label="Interne Notiz" for="dash-code-note">
            <Textarea
              id="dash-code-note"
              value={p.state.note.get()}
              onInput={(event) => p.state.note.set(event.currentTarget.value)}
              placeholder="Nur für dein Team sichtbar"
              rows={2}
              disabled={!p.canEdit}
            />
          </DashField>
          <Show when={!isNew() && p.existing}>
            {(code) => (
              <div class="rounded-card border border-border-subtle bg-surface-muted/40 px-3 py-2 text-xs text-content-muted">
                {dashCodeUsageText(code())} genutzt · {dashCodeValidityText(code())}
              </div>
            )}
          </Show>
          <div class="rounded-card border border-border-subtle bg-surface p-4">
            <p class="text-sm font-semibold">So sieht der Käufer es</p>
            <div class="mt-2 flex flex-col gap-2">
              <Input
                class="h-10 font-mono text-sm uppercase rounded-control"
                value={buyerCode()}
                onInput={(event) => setBuyerCode(event.currentTarget.value.toUpperCase())}
                placeholder={enteredCode() || "CODE"}
                aria-label="Code zum Ausprobieren"
              />
              <p class="text-sm text-emerald-700 dark:text-emerald-300">
                {buyerCode() || enteredCode() || "CODE"} · {previewValue()}
              </p>
              <Show when={p.existing}>
                {(code) => (
                  <p class="text-xs text-content-muted">
                    Aktuell: {code().code} · {dashCodeValueText(code(), p.types)}
                  </p>
                )}
              </Show>
            </div>
          </div>
          <ToggleSwitch
            checked={p.state.active.get()}
            onChange={(checked) => p.state.active.set(checked)}
            label="Aktiv"
            description="Inaktive Codes lehnt der Checkout ab"
            disabled={!p.canEdit}
          />
        </div>
      </Sheet>
      <ConfirmDialog
        open={p.state.confirmOpen.get()}
        onOpenChange={(open) => p.state.confirmOpen.set(open)}
        title={`Code „${p.existing?.code ?? ""}“ löschen?`}
        description="Der Code wird endgültig entfernt."
        confirmLabel="Löschen"
        tone="danger"
        onConfirm={remove}
      />
    </>
  )
}
