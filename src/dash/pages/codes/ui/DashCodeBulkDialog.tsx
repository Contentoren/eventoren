import { createMemo, createSignal, For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { CorvuDialog } from "#ui/interactive/dialog/CorvuDialog.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashCodeGenerate } from "../../../model/dashCodeGenerate.ts"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashMoneyParse } from "../../../ui/form/dashMoneyParse.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { dashCodeBulkCreate } from "../../../store/actions/codes/dashCodeBulkCreate.ts"
import { dashCsvCreate } from "../../../export/dashCsvCreate.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { dashNow } from "../../../store/dashNow.ts"

/** Dialog „Mehrere erstellen“ (?mehrere=1): Präfix, Anzahl, Art, Limit + 5er-Vorschau. */
export function DashCodeBulkDialog(p: {
  open: boolean
  event: DashEvent
  types: DashTicketType[]
  codes: string[]
  canEdit: boolean
}) {
  const navigate = useNavigate()
  const now = dashNow()
  const [prefix, setPrefix] = createSignal("ABI-")
  const [countText, setCountText] = createSignal("10")
  const [kind, setKind] = createSignal<"rabatt" | "zugang">("rabatt")
  const [discountType, setDiscountType] = createSignal<"prozent" | "betrag">("prozent")
  const [percentText, setPercentText] = createSignal("10")
  const [amountCents, setAmountCents] = createSignal<number | null>(500)
  const [freischaltung, setFreischaltung] = createSignal<string[]>([])
  const [limitText, setLimitText] = createSignal("")
  const [created, setCreated] = createSignal<string[]>([])

  const hiddenTypes = () => p.types.filter((type) => type.hidden && type.archivedAt === null)
  const count = () => {
    const parsed = Number.parseInt(countText().trim(), 10)
    return Number.isInteger(parsed) ? parsed : Number.NaN
  }

  const preview = createMemo((): string[] => {
    if (created().length > 0) return created().slice(0, 5)
    try {
      return dashCodeGenerate({
        prefix: prefix(),
        count: 5,
        existing: p.codes,
        random: dashRandomCreate(20261018),
      })
    } catch {
      return []
    }
  })

  const close = () => {
    setCreated([])
    void navigate({
      to: `/demo/dashboard/events/${p.event.id}/codes` as never,
      search: { art: kind() } as never,
      replace: false,
      resetScroll: false,
    })
  }

  const save = () => {
    const amount = count()
    if (!Number.isInteger(amount) || amount < 1 || amount > 500) {
      toastAdd({ title: "Die Anzahl muss zwischen 1 und 500 liegen.", variant: "error" })
      return
    }
    const discount =
      kind() === "rabatt"
        ? discountType() === "prozent"
          ? { type: "prozent" as const, value: dashMoneyParse(percentText().replace("%", "")) ?? 0 }
          : { type: "betrag" as const, value: amountCents() ?? 0 }
        : null
    const limitRaw = limitText().trim()
    const result = dashCodeBulkCreate({
      eventId: p.event.id,
      prefix: prefix(),
      count: amount,
      kind: kind(),
      discount,
      ticketTypeIds: kind() === "zugang" ? freischaltung() : [],
      maxTickets: limitRaw === "" ? null : Number.parseInt(limitRaw, 10),
      validFrom: null,
      validUntil: null,
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    setCreated(result.data.map((code) => code.code))
    toastAdd({ title: `${result.data.length} Codes erstellt`, variant: "success" })
  }

  const download = () => {
    const rows = created().map((code): (string | number | null)[] => [code])
    const csv = dashCsvCreate(["Code"], rows)
    dashDownload(dashFileNameCreate(["codes", p.event.title], "csv", now()), csv, "text/csv;charset=utf-8")
  }

  return (
    <CorvuDialog
      open={p.open}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Mehrere Codes erstellen"
      description="Bis zu 500 Codes mit Präfix auf einmal."
    >
      <div class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <DashField label="Präfix" for="dash-bulk-prefix" hint="Z. B. ABI-">
            <Input
              id="dash-bulk-prefix"
              class="h-10 font-mono text-sm uppercase rounded-control"
              value={prefix()}
              onInput={(event) => setPrefix(event.currentTarget.value.toUpperCase())}
              placeholder="ABI-"
            />
          </DashField>
          <DashField label="Anzahl" for="dash-bulk-count" hint="1 bis 500">
            <Input
              id="dash-bulk-count"
              class="h-10 text-sm rounded-control"
              inputmode="numeric"
              value={countText()}
              onInput={(event) => setCountText(event.currentTarget.value.replace(/[^0-9]/g, ""))}
              placeholder="10"
            />
          </DashField>
        </div>
        <DashField label="Art">
          <SegmentedControl
            value={kind()}
            onChange={(value) => setKind(value as "rabatt" | "zugang")}
            options={[
              { value: "rabatt", label: "Rabatt" },
              { value: "zugang", label: "Zugang" },
            ]}
            ariaLabel="Codeart"
          />
        </DashField>
        <Show
          when={kind() === "rabatt"}
          fallback={
            <DashField label="Freischaltung" hint="Versteckte Ticketarten">
              <div class="flex flex-col gap-1.5">
                <For each={hiddenTypes()}>
                  {(type) => (
                    <label class="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={freischaltung().includes(type.id)}
                        onChange={() =>
                          setFreischaltung((list) =>
                            list.includes(type.id) ? list.filter((id) => id !== type.id) : [...list, type.id],
                          )
                        }
                        aria-label={type.name}
                      />
                      <span>{type.name}</span>
                    </label>
                  )}
                </For>
              </div>
            </DashField>
          }
        >
          <DashField label="Rabatt">
            <SegmentedControl
              value={discountType()}
              onChange={(value) => setDiscountType(value as "prozent" | "betrag")}
              options={[
                { value: "prozent", label: "Prozent" },
                { value: "betrag", label: "Betrag" },
              ]}
              ariaLabel="Rabattart"
            />
          </DashField>
          <Show
            when={discountType() === "prozent"}
            fallback={
              <DashField label="Betrag je Ticket">
                <DashMoneyInput valueCents={amountCents()} onChange={setAmountCents} />
              </DashField>
            }
          >
            <DashField label="Prozent" hint="Beispiel: 10 für 10 %">
              <Input
                class="h-10 text-sm rounded-control"
                inputmode="decimal"
                value={percentText()}
                onInput={(event) => setPercentText(event.currentTarget.value)}
                placeholder="10"
              />
            </DashField>
          </Show>
        </Show>
        <DashField label="Limit je Code" hint="Leer lassen für unbegrenzt">
          <Input
            class="h-10 text-sm rounded-control"
            inputmode="numeric"
            value={limitText()}
            onInput={(event) => setLimitText(event.currentTarget.value.replace(/[^0-9]/g, ""))}
            placeholder="Unbegrenzt"
          />
        </DashField>
        <div class="rounded-card border border-border-subtle bg-surface-muted/40 p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">Vorschau</p>
          <div class="mt-1.5 flex flex-wrap gap-1.5">
            <For each={preview()}>
              {(code) => <span class="rounded bg-surface px-2 py-1 font-mono text-xs">{code}</span>}
            </For>
          </div>
          <p class="mt-1.5 text-xs text-content-muted">
            {discountType() === "prozent" && kind() === "rabatt"
              ? `${percentText()} % je Ticket`
              : kind() === "rabatt"
                ? `${dashCentsFormat(amountCents() ?? 0)} je Ticket`
                : "schaltet versteckte Ticketarten frei"}
          </p>
        </div>
        <Show when={created().length > 0}>
          <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={download}>
            Als CSV herunterladen
          </Button>
        </Show>
        <Show when={p.canEdit}>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={close}>
              {created().length > 0 ? "Schließen" : "Abbrechen"}
            </Button>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={save}>
              {created().length > 0 ? "Weitere erstellen" : "Erstellen"}
            </Button>
          </div>
        </Show>
      </div>
    </CorvuDialog>
  )
}

export function dashCodesBulkStateCreate() {
  return { created: createSignalObject<string[]>([]) }
}
