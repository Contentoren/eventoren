import { createSignal, For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiInformationOutline } from "@adaptive-ds/mdi/mdiInformationOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { InfoPopover } from "#ui/interactive/popover/InfoPopover.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { DotPill } from "#ui/static/pill/DotPill.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashFeeCompute } from "../../../model/dashFeeCompute.ts"
import { dashPhaseResolve } from "../../../model/dashPhaseResolve.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import type { DashTicketChannel } from "../../../model/dashTicketChannelSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashTicketTypeDelete } from "../../../store/actions/dashTicketTypeDelete.ts"
import { dashTicketTypeUpsert, type DashTicketTypeUpsertInput } from "../../../store/actions/dashTicketTypeUpsert.ts"
import {
  dashTicketFormCreate,
  type DashTicketForm,
  type DashTicketFormInitial,
  type DashTicketPhaseForm,
} from "../model/dashTicketFormCreate.ts"
import { dashTicketFormIsValid, dashTicketFormValidate } from "../model/dashTicketFormValidate.ts"
import { dashTicketFormToInput } from "../model/dashTicketFormToInput.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type DashTicketSheetState = {
  form: DashTicketForm
  confirmOpen: ReturnType<typeof createSignalObject<boolean>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
}

function initialCreate(args: {
  ticket: DashTicketType | null
  channelDefault: DashTicketChannel
  taxDefault: 1900 | 700
}): DashTicketFormInitial {
  const ticket = args.ticket
  if (!ticket) return { channel: args.channelDefault, taxRateBps: args.taxDefault, capacity: null, maxPerOrder: 10 }
  return {
    name: ticket.name,
    description: ticket.description,
    channel: ticket.channel,
    capacity: ticket.capacity,
    maxPerOrder: ticket.maxPerOrder,
    taxRateBps: ticket.taxRateBps,
    hidden: ticket.hidden,
    salesStartAt: ticket.salesStartAt,
    salesEndAt: ticket.salesEndAt,
    phases: ticket.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      priceCents: phase.priceCents,
      endsAt: phase.endsAt,
      quota: phase.quota,
    })),
  }
}

/** Sheet-State: Formular + Dialog-Flags (reine Signale). */
export function DashTicketSheetStateCreate(args: {
  ticket: DashTicketType | null
  channelDefault: DashTicketChannel
  taxDefault: 1900 | 700
}): DashTicketSheetState & { taxDefault: 1900 | 700 } {
  return {
    form: dashTicketFormCreate(initialCreate(args)),
    confirmOpen: createSignalObject(false),
    showErrors: createSignalObject(false),
    taxDefault: args.taxDefault,
  }
}

function earlyBirdApply(args: { form: DashTicketForm; eventStartsAt: string }) {
  const phases = args.form.phases.get()
  const firstPrice = phases[0]?.priceCents.get() ?? 2400
  const base = firstPrice ?? 2400
  const early = Math.max(0, Math.round((base * 0.8) / 100) * 100)
  const eventStart = Date.parse(args.eventStartsAt)
  const endsAt = new Date(eventStart - 30 * 86_400_000).toISOString()
  const capacity = args.form.capacity.get() ?? 100
  const quota = Math.max(1, Math.round(capacity * 0.25))
  const existing = phases[0]
  const second = phases[1]
  args.form.phases.set([
    {
      id: existing?.id ?? `ph-form-${Math.random().toString(36).slice(2, 10)}`,
      name: existing?.name ?? createSignalObject("Early Bird"),
      priceCents: createSignalObject<number | null>(early),
      endsAt: createSignalObject<string | null>(endsAt),
      quota: createSignalObject<number | null>(quota),
    },
    {
      id: second?.id ?? `ph-form-${Math.random().toString(36).slice(2, 10)}`,
      name: second?.name ?? createSignalObject("Regulär"),
      priceCents: createSignalObject<number | null>(base),
      endsAt: createSignalObject<string | null>(null),
      quota: createSignalObject<number | null>(null),
    },
  ])
}

/** Preis-Input einer Phase: DashMoneyInput, onPrice meldet live ans Sheet (Preisrechner). */
function DashPhasePriceInput(p: { phase: DashTicketPhaseForm; onPrice: (cents: number | null) => void }) {
  return (
    <DashMoneyInput
      valueCents={p.phase.priceCents.get()}
      onChange={(cents) => {
        p.phase.priceCents.set(cents)
        p.onPrice(cents)
      }}
      ariaLabel="Phasenpreis in Euro"
      class="w-32"
    />
  )
}

/** Aktive Preisphase aus dem Formular-Stand ableiten (neue Tickets + Bearbeitung ohne Verkauf). */
function dashFormActivePhaseIndex(args: { form: DashTicketForm; now: Date }): number {
  const phases = args.form.phases.get()
  const salesStart = args.form.startMode.get() === "datum" ? args.form.startAt.get() : null
  if (salesStart !== null && args.now < new Date(salesStart)) return -1
  const salesEnd = args.form.endMode.get() === "datum" ? args.form.endAt.get() : null
  if (salesEnd !== null && args.now >= new Date(salesEnd)) return -1
  for (const [index, phase] of phases.entries()) {
    const endsAt = phase.endsAt.get()
    if (endsAt !== null && args.now >= new Date(endsAt)) continue
    return index
  }
  return phases.length > 0 ? phases.length - 1 : -1
}

/** Phasenkarte: Name + Preis in Reihe 1, optionale Enden (Datum/Anzahl) in Reihe 2. */
function DashPhaseCard(p: {
  phase: DashTicketPhaseForm
  index: number
  active: boolean
  showErrors: boolean
  nameError?: string
  priceError?: string
  endsError?: string
  onPrice: (cents: number | null) => void
  onRemove: () => void
}) {
  const [dateOn, setDateOn] = createSignal(p.phase.endsAt.get() !== null)
  const [quotaOn, setQuotaOn] = createSignal(p.phase.quota.get() !== null)
  const toggleDate = (checked: boolean) => {
    setDateOn(checked)
    if (!checked) p.phase.endsAt.set(null)
  }
  const toggleQuota = (checked: boolean) => {
    setQuotaOn(checked)
    if (!checked) p.phase.quota.set(null)
  }
  return (
    <li
      class={
        "flex min-w-0 flex-col gap-3 rounded-control border border-border-subtle p-3" +
        (p.active ? " ring-1 ring-brand/40" : "")
      }
    >
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <span
          aria-hidden="true"
          class="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold tabular-nums text-content-muted"
        >
          {p.index + 1}
        </span>
        <Input
          class="h-10 min-w-0 flex-1 basis-32 text-sm rounded-control"
          value={p.phase.name.get()}
          aria-label={`Phasenname ${p.index + 1}`}
          onInput={(event) => p.phase.name.set(event.currentTarget.value)}
        />
        <DashPhasePriceInput phase={p.phase} onPrice={p.onPrice} />
        <Show when={p.active}>
          <DotPill tone="brand" size="sm" class="shrink-0">
            Aktiv
          </DotPill>
        </Show>
        <ButtonIconOnly
          type="button"
          variant="ghost"
          icon={mdiTrashCanOutline}
          title="Phase entfernen"
          aria-label="Phase entfernen"
          onClick={p.onRemove}
          class="shrink-0"
        />
      </div>
      <Show when={p.showErrors && (p.nameError !== undefined || p.priceError !== undefined)}>
        <p role="alert" class="text-xs text-danger">
          {p.nameError ?? p.priceError}
        </p>
      </Show>
      <div class="flex flex-col gap-2 text-sm">
        <span class="text-content-muted">Endet</span>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2">
            <Checkbox checked={dateOn()} onChange={toggleDate} aria-label={`Phase ${p.index + 1} endet am Datum`} />
            <span>am Datum</span>
          </label>
          <Show when={dateOn()}>
            <DashDateTimeInput valueIso={p.phase.endsAt.get()} onChange={(iso) => p.phase.endsAt.set(iso)} />
          </Show>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={quotaOn()}
              onChange={toggleQuota}
              aria-label={`Phase ${p.index + 1} endet nach Anzahl`}
            />
            <span>nach Anzahl</span>
          </label>
          <Show when={quotaOn()}>
            <span class="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                class="h-10 w-28 text-sm rounded-control tabular-nums"
                value={p.phase.quota.get() ?? ""}
                aria-label={`Phase ${p.index + 1} endet nach Anzahl Tickets`}
                placeholder="—"
                onInput={(event) => {
                  const raw = event.currentTarget.value
                  p.phase.quota.set(raw === "" ? null : Number(raw))
                }}
              />
              <span class="text-content-muted">Tickets</span>
            </span>
          </Show>
        </div>
        <Show when={p.showErrors && p.endsError !== undefined}>
          {(message) => (
            <p role="alert" class="text-xs text-danger">
              {message()}
            </p>
          )}
        </Show>
      </div>
    </li>
  )
}

/** Sheet „Ticketart“ (?ticket=<id>|neu, size lg): Felder, Preisphasen, Preisrechner, Footer. */
export function DashTicketSheet(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: DashEvent
  orgId: string
  ticket: DashTicketType | null
  channelDefault: DashTicketChannel
  orders: DashOrder[]
  tickets: DashTicket[]
  now: Date
  state: DashTicketSheetState
}) {
  const navigate = useNavigate()
  const form = p.state.form
  // Sheet bei Ticketwechsel neu befüllen (Signale + Phasenobjekte bleiben referenzstabil).
  {
    const key = p.ticket?.id ?? "neu"
    const last = (form as { __d7key?: string }).__d7key
    if (last !== key) {
      ;(form as { __d7key?: string }).__d7key = key
      const fresh = dashTicketFormCreate(
        initialCreate({
          ticket: p.ticket,
          channelDefault: p.channelDefault,
          taxDefault: (p.state as unknown as { taxDefault: 1900 | 700 }).taxDefault,
        }),
      )
      form.name.set(fresh.name.get())
      form.description.set(fresh.description.get())
      form.channel.set(fresh.channel.get())
      form.capacity.set(fresh.capacity.get())
      form.maxPerOrder.set(fresh.maxPerOrder.get())
      form.taxRateBps.set(fresh.taxRateBps.get())
      form.hidden.set(fresh.hidden.get())
      form.startMode.set(fresh.startMode.get())
      form.startAt.set(fresh.startAt.get())
      form.endMode.set(fresh.endMode.get())
      form.endAt.set(fresh.endAt.get())
      form.phases.set(fresh.phases.get())
    }
  }
  const org = () => dashStateGet().orgs.find((entry) => entry.id === p.orgId) ?? null
  const isNew = () => p.ticket === null
  const sold = () =>
    p.ticket ? dashTicketTypeSales({ ticketType: p.ticket, orders: p.orders, tickets: p.tickets }).sold : 0
  const errors = () => dashTicketFormValidate(form, sold())
  const isKlein = () => org()?.tax.status === "klein"

  const [priceOverride, setPriceOverride] = createSignal<number | null | undefined>(undefined)
  const activePhasePrice = () => {
    const phases = form.phases.get()
    if (priceOverride() !== undefined) return priceOverride() ?? 0
    const first = phases[0]?.priceCents.get()
    if (p.ticket) {
      const sales = dashTicketTypeSales({ ticketType: p.ticket, orders: p.orders, tickets: p.tickets })
      const resolved = dashPhaseResolve(p.ticket, sales.soldByPhase, p.now)
      if (resolved.phase) {
        const match = phases.find((phase) => phase.name.get() === resolved.phase?.name)
        return match?.priceCents.get() ?? resolved.phase.priceCents
      }
    }
    return first ?? 0
  }

  const fee = () => {
    const price = activePhasePrice() ?? 0
    return dashFeeCompute({
      priceCents: price,
      fee: org()?.fee ?? { percentBps: 500, fixedCents: 49, payer: "kaeufer" as const },
    })
  }

  const calculatorText = () => {
    const price = activePhasePrice() ?? 0
    const computed = fee()
    const buyerPays = (org()?.fee.payer ?? "kaeufer") === "kaeufer" ? computed.buyerPaysCents : price
    const gets = computed.organizerGetsCents
    return `Ticket ${dashCentsFormat(price)} · Gebühr ${dashCentsFormat(computed.feeCents)} · Käufer zahlt ${dashCentsFormat(buyerPays)} · Du erhältst ${dashCentsFormat(gets)}`
  }

  const close = () => {
    const params = new URLSearchParams(window.location.search)
    params.delete("ticket")
    const query = params.toString()
    void navigate({
      to: `/demo/dashboard/events/${p.event.id}/tickets` as never,
      search: Object.fromEntries(params.entries()) as never,
      replace: true,
      resetScroll: false,
    })
    void query
    p.onOpenChange(false)
  }

  const save = () => {
    p.state.showErrors.set(true)
    const current = errors()
    if (!dashTicketFormIsValid(current)) {
      const first = [
        current.name,
        current.capacity,
        current.maxPerOrder,
        current.startAt,
        current.endAt,
        current.phasesGeneral,
        ...Object.values(current.phaseNames),
        ...Object.values(current.phasePrices),
        ...Object.values(current.phaseEnds),
      ].find((message) => message !== undefined)
      toastAdd({ title: first ?? "Bitte prüfe die markierten Felder", variant: "error" })
      return
    }
    const existingIds = new Set((p.ticket?.phases ?? []).map((phase) => phase.id))
    const input = dashTicketFormToInput({
      form: form,
      eventId: p.event.id,
      ...(p.ticket ? { ticketId: p.ticket.id, sortOrder: p.ticket.sortOrder } : {}),
      existingPhaseIds: existingIds,
    })
    const withArchived: DashTicketTypeUpsertInput = p.ticket?.archivedAt
      ? { ...input, archivedAt: p.ticket.archivedAt }
      : input
    const result = dashTicketTypeUpsert(withArchived)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: "Ticketart gespeichert", variant: "success" })
    close()
  }

  const remove = () => {
    if (!p.ticket) return
    const result = dashTicketTypeDelete(p.ticket.id)
    p.state.confirmOpen.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: result.data === "geloescht" ? "Ticketart gelöscht" : "Ticketart archiviert", variant: "success" })
    close()
  }

  const addPhase = () => {
    const phases = form.phases.get()
    form.phases.set([
      ...phases,
      {
        id: `ph-form-${Math.random().toString(36).slice(2, 10)}`,
        name: createSignalObject(`Phase ${phases.length + 1}`),
        priceCents: createSignalObject<number | null>(null),
        endsAt: createSignalObject<string | null>(null),
        quota: createSignalObject<number | null>(null),
      },
    ])
  }

  return (
    <>
      <Sheet
        open={p.open}
        onOpenChange={(open) => {
          if (!open) close()
          else p.onOpenChange(open)
        }}
        title={isNew() ? "Ticketart hinzufügen" : `Ticketart „${p.ticket?.name ?? ""}“`}
        description={
          isNew() ? "Name, Kanal, Kontingent und Preisphasen festlegen." : "Details und Preisphasen bearbeiten."
        }
        size="lg"
        footer={
          <div class="flex items-center justify-between gap-2">
            <Show when={!isNew()}>
              <Button
                type="button"
                variant="outline"
                class="h-9 px-3 text-sm"
                onClick={() => p.state.confirmOpen.set(true)}
              >
                {sold() > 0 ? "Archivieren" : "Löschen"}
              </Button>
            </Show>
            <div class="ms-auto flex gap-2">
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={close}>
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
            for="dash-ticket-name"
            required
            error={p.state.showErrors.get() ? errors().name : undefined}
          >
            <Input
              id="dash-ticket-name"
              class="h-10 text-sm rounded-control"
              value={form.name.get()}
              onInput={(event) => form.name.set(event.currentTarget.value)}
              placeholder="z. B. Stehplatz"
            />
          </DashField>
          <DashField label="Beschreibung" for="dash-ticket-description">
            <Textarea
              id="dash-ticket-description"
              class="h-10 text-sm rounded-control"
              rows={2}
              value={form.description.get()}
              onInput={(event) => form.description.set(event.currentTarget.value)}
              placeholder="Kurz, was die Käufer erwartet."
            />
          </DashField>
          <DashField label="Kanal">
            <SegmentedControl
              value={form.channel.get()}
              onChange={(value) => form.channel.set(value === "abendkasse" ? "abendkasse" : "online")}
              options={[
                { value: "online", label: "Online" },
                { value: "abendkasse", label: "Abendkasse" },
              ]}
              ariaLabel="Kanal wählen"
            />
          </DashField>
          <div class="grid grid-cols-2 gap-3">
            <DashField
              label="Kontingent"
              for="dash-ticket-capacity"
              required
              error={p.state.showErrors.get() ? errors().capacity : undefined}
            >
              <Input
                id="dash-ticket-capacity"
                type="number"
                min={0}
                step={1}
                class="h-10 text-sm rounded-control tabular-nums"
                value={form.capacity.get() ?? ""}
                onInput={(event) => {
                  const raw = event.currentTarget.value
                  form.capacity.set(raw === "" ? null : Number(raw))
                }}
                placeholder="100"
              />
            </DashField>
            <DashField
              label="Max. pro Bestellung"
              for="dash-ticket-max"
              required
              error={p.state.showErrors.get() ? errors().maxPerOrder : undefined}
            >
              <Input
                id="dash-ticket-max"
                type="number"
                min={1}
                step={1}
                class="h-10 text-sm rounded-control tabular-nums"
                value={form.maxPerOrder.get() ?? ""}
                onInput={(event) => {
                  const raw = event.currentTarget.value
                  form.maxPerOrder.set(raw === "" ? null : Number(raw))
                }}
                placeholder="10"
              />
            </DashField>
          </div>
          <Show
            when={!isKlein()}
            fallback={
              <p class="rounded-control bg-surface-muted px-3 py-2 text-sm text-content-muted">
                Kleinunternehmer – keine USt
              </p>
            }
          >
            <DashField label="Steuersatz">
              <SegmentedControl
                value={String(form.taxRateBps.get())}
                onChange={(value) => form.taxRateBps.set(value === "1900" ? 1900 : 700)}
                options={[
                  { value: "1900", label: "19 %" },
                  { value: "700", label: "7 %" },
                ]}
                ariaLabel="Steuersatz wählen"
              />
            </DashField>
          </Show>
          <ToggleSwitch
            checked={form.hidden.get()}
            onChange={(checked) => form.hidden.set(checked)}
            label="Versteckt"
            description="Nur mit Zugangscode sichtbar"
          />
          <Show when={form.hidden.get()}>
            <div>
              <LinkButtonInternal
                to={`/demo/dashboard/events/${p.event.id}/codes`}
                search={{ art: "zugang", code: "neu" } as never}
                variant="link"
                class="h-auto px-0 text-sm"
              >
                Zugangscode erstellen
              </LinkButtonInternal>
            </div>
          </Show>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DashField label="Verkaufsstart" error={p.state.showErrors.get() ? errors().startAt : undefined}>
              <div class="flex flex-col gap-2">
                <SegmentedControl
                  value={form.startMode.get()}
                  onChange={(value) => form.startMode.set(value === "datum" ? "datum" : "sofort")}
                  options={[
                    { value: "sofort", label: "Sofort" },
                    { value: "datum", label: "Datum" },
                  ]}
                  ariaLabel="Verkaufsstart wählen"
                />
                <Show when={form.startMode.get() === "datum"}>
                  <DashDateTimeInput valueIso={form.startAt.get()} onChange={(iso) => form.startAt.set(iso)} />
                </Show>
              </div>
            </DashField>
            <DashField label="Verkaufsende" error={p.state.showErrors.get() ? errors().endAt : undefined}>
              <div class="flex flex-col gap-2">
                <SegmentedControl
                  value={form.endMode.get()}
                  onChange={(value) => form.endMode.set(value === "datum" ? "datum" : "eventbeginn")}
                  options={[
                    { value: "eventbeginn", label: "Bei Eventbeginn" },
                    { value: "datum", label: "Datum" },
                  ]}
                  ariaLabel="Verkaufsende wählen"
                />
                <Show when={form.endMode.get() === "datum"}>
                  <DashDateTimeInput valueIso={form.endAt.get()} onChange={(iso) => form.endAt.set(iso)} />
                </Show>
              </div>
            </DashField>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-content">Preisphasen</h3>
              <div class="flex gap-2">
                <Button type="button" variant="outline" class="h-8 px-2.5 text-sm" onClick={addPhase}>
                  <Icon path={mdiPlus} class="size-4" />
                  Phase hinzufügen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  class="h-8 px-2.5 text-sm"
                  onClick={() => earlyBirdApply({ form: form, eventStartsAt: p.event.startsAt })}
                >
                  Early Bird + Regulär
                </Button>
              </div>
            </div>
            <Show when={p.state.showErrors.get() && errors().phasesGeneral}>
              {(message) => (
                <p role="alert" class="text-xs text-danger">
                  {message()}
                </p>
              )}
            </Show>
            <ul class="flex flex-col gap-3">
              <For each={form.phases.get()}>
                {(phase, index) => (
                  <DashPhaseCard
                    phase={phase}
                    index={index()}
                    active={dashFormActivePhaseIndex({ form: form, now: p.now }) === index()}
                    showErrors={p.state.showErrors.get()}
                    nameError={errors().phaseNames[phase.id]}
                    priceError={errors().phasePrices[phase.id]}
                    endsError={errors().phaseEnds[phase.id]}
                    onPrice={(cents) => setPriceOverride(cents)}
                    onRemove={() => form.phases.set(form.phases.get().filter((candidate) => candidate.id !== phase.id))}
                  />
                )}
              </For>
            </ul>
            <p class="flex items-center gap-1.5 text-xs text-content-muted">
              <Icon path={mdiInformationOutline} class="size-4 shrink-0" />
              Wechsel automatisch, sobald Datum oder Anzahl erreicht ist
            </p>
          </div>
          <div class="rounded-control bg-surface-muted p-3 text-sm">
            <p class="font-medium text-content">Preisrechner</p>
            <p class="mt-1 text-content">
              {calculatorText()}{" "}
              <InfoPopover>
                <p class="max-w-60 text-sm">Gebührenmodell vom Plattform-Admin festgelegt</p>
              </InfoPopover>
            </p>
          </div>
        </div>
      </Sheet>
      <ConfirmDialog
        open={p.state.confirmOpen.get()}
        onOpenChange={(open) => p.state.confirmOpen.set(open)}
        title={
          sold() > 0 ? `„${p.ticket?.name ?? "Ticketart"}“ archivieren?` : `„${p.ticket?.name ?? "Ticketart"}“ löschen?`
        }
        description={
          sold() > 0
            ? "Die Ticketart wird aus dem Verkauf genommen, verkaufte Tickets bleiben gültig."
            : "Die Ticketart wird endgültig entfernt."
        }
        consequences={
          sold() > 0
            ? [{ text: `${sold()} verkaufte Tickets bleiben gültig`, tone: "warning" }]
            : [{ text: "Noch keine Tickets verkauft", tone: "neutral" }]
        }
        confirmLabel={sold() > 0 ? "Archivieren" : "Löschen"}
        tone="danger"
        onConfirm={remove}
      />
    </>
  )
}
