import { Show, createEffect, createMemo, on } from "solid-js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashKpiCard } from "../../../ui/kpi/DashKpiCard.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { DashVouchersStateCreate } from "../DashVouchersStateCreate.ts"
import { DashVoucherCreateSheetStateCreate } from "../DashVoucherCreateSheetState.ts"
import { dashVoucherListFilter, type DashVouchersStatusFilter } from "../dashVoucherListFilter.ts"
import { DashVouchersList } from "./DashVouchersList.tsx"
import { DashVoucherCreateSheet } from "./DashVoucherCreateSheet.tsx"
import { DashVoucherDetailSheet } from "./DashVoucherDetailSheet.tsx"

export type DashVouchersSearch = {
  gutschein: string | undefined
  status: DashVouchersStatusFilter
  q: string
}

const statusChips: { value: DashVouchersStatusFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "aktiv", label: "Aktiv" },
  { value: "eingeloest", label: "Eingelöst" },
  { value: "abgelaufen", label: "Abgelaufen" },
  { value: "deaktiviert", label: "Deaktiviert" },
]

export function dashVouchersSearchParse(raw: Record<string, unknown>): DashVouchersSearch {
  const gutschein = typeof raw["gutschein"] === "string" && raw["gutschein"] !== "" ? raw["gutschein"] : undefined
  const statusRaw = typeof raw["status"] === "string" ? raw["status"] : "alle"
  const status: DashVouchersStatusFilter =
    statusRaw === "aktiv" || statusRaw === "eingeloest" || statusRaw === "abgelaufen" || statusRaw === "deaktiviert"
      ? statusRaw
      : "alle"
  const q = typeof raw["q"] === "string" ? raw["q"] : ""
  return { gutschein, status, q }
}

/** Seite „Gutscheine“: KPIs, Hinweis-Chip, Suche, Status-Chips, Tabelle, Create- und Detail-Sheet. */
export function DashVouchersPage(p: {
  search: () => DashVouchersSearch
  onPatch: (patch: Partial<DashVouchersSearch>) => void
}) {
  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("gutscheine.bearbeiten")
  const now = dashNow()
  const state = DashVouchersStateCreate()

  const vouchers = () => {
    const active = org()
    if (!active) return []
    return dashStateGet().vouchers.filter((voucher) => voucher.orgId === active.id)
  }

  const result = () =>
    dashVoucherListFilter({
      vouchers: vouchers(),
      orders: dashStateGet().orders,
      q: p.search().q,
      status: p.search().status,
    })

  const detailId = () => p.search().gutschein
  const detailVoucher = () => {
    const id = detailId()
    if (!id || id === "neu") return null
    return vouchers().find((voucher) => voucher.id === id) ?? null
  }
  const createOpen = () => detailId() === "neu"
  const successVoucher = () => vouchers().find((voucher) => voucher.id === state.successId.get()) ?? null

  const createSheetState = () => {
    void detailId()
    return DashVoucherCreateSheetStateCreate(org()?.voucherDefaultValidity ?? "3-jahre-jahresende")
  }
  const createState = createMemo(createSheetState)

  createEffect(
    on(
      () => detailVoucher()?.id,
      (id) => {
        const voucher = detailVoucher()
        if (!id || !voucher) return
        state.validityValue.set(voucher.validity)
        state.validityDate.set(
          voucher.validity === "datum" && voucher.expiresAt !== null ? voucher.expiresAt.slice(0, 10) : "",
        )
      },
    ),
  )

  const closeSearch = () => {
    state.successId.set(null)
    p.onPatch({ gutschein: undefined })
  }

  const openNew = () => {
    if (!canEdit()) {
      toastAdd({ title: "Dir fehlt das Recht „Gutscheine bearbeiten“.", variant: "error" })
      return
    }
    state.successId.set(null)
    p.onPatch({ gutschein: "neu" })
  }

  const afterCreated = (id: string) => {
    state.successId.set(id)
  }

  const createSheetOpenChange = (open: boolean) => {
    if (!open) closeSearch()
  }

  const detailOpenChange = (open: boolean) => {
    if (!open) closeSearch()
  }

  return (
    <div>
      <DashPageHeader
        title="Gutscheine"
        description="Verkauft oder verschenkt Guthaben für deine Events."
        actions={
          <Show when={canEdit()}>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={openNew}>
              <Icon path={mdiPlus} class="size-4" />
              Gutschein erstellen
            </Button>
          </Show>
        }
      />
      <Show when={org()} fallback={<DashLockedState description="Keine Organisation aktiv." />}>
        {(active) => (
          <Show
            when={canEdit()}
            fallback={
              <DashLockedState description="Gutscheine sehen nur Rollen mit dem Recht „Gutscheine bearbeiten“." />
            }
          >
            <div class="flex flex-col gap-4">
              <div class="grid gap-3 sm:grid-cols-3">
                <DashKpiCard label="Ausgegeben" value={dashCentsFormat(result().issuedCents)} icon={mdiGiftOutline} />
                <DashKpiCard label="Eingelöst" value={dashCentsFormat(result().redeemedCents)} icon={mdiGiftOutline} />
                <DashKpiCard
                  label="Offenes Guthaben"
                  value={dashCentsFormat(result().openCents)}
                  icon={mdiGiftOutline}
                />
              </div>
              <p class="w-fit rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs text-content-muted">
                Gilt nur für Events von {active().name}
              </p>
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="relative min-w-52 flex-1 sm:max-w-xs">
                    <span class="sr-only">Gutscheine suchen</span>
                    <Icon
                      path={mdiMagnify}
                      class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
                    />
                    <Input
                      type="search"
                      value={p.search().q}
                      onInput={(event) => p.onPatch({ q: event.currentTarget.value })}
                      placeholder="Code, Name, E-Mail …"
                      aria-label="Gutscheine suchen"
                      class="h-9 pl-9 text-sm rounded-control"
                    />
                  </label>
                </div>
                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Status filtern">
                  {statusChips.map((chip) => (
                    <FilterChip
                      active={p.search().status === chip.value}
                      onClick={() => p.onPatch({ status: chip.value })}
                      count={result().counts[chip.value]}
                    >
                      {chip.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div class="rounded-card border border-border-subtle bg-surface">
                <DashVouchersList
                  rows={result().rows}
                  now={now()}
                  onSelect={(row) => p.onPatch({ gutschein: row.voucher.id })}
                  empty={
                    p.search().q.trim() !== "" || p.search().status !== "alle"
                      ? "Keine Gutscheine für diesen Filter. Passe Suche oder Status an."
                      : "Noch keine Gutscheine. Erstelle deinen ersten Gutschein."
                  }
                />
              </div>
              <Show when={createOpen()}>
                <DashVoucherCreateSheet
                  open
                  onOpenChange={createSheetOpenChange}
                  state={createState()}
                  created={successVoucher()}
                  onCreated={(voucher) => afterCreated(voucher.id)}
                  onClose={closeSearch}
                />
              </Show>
              <Show when={detailVoucher()}>
                {(voucher) => (
                  <DashVoucherDetailSheet
                    open
                    voucher={voucher()}
                    org={active()}
                    orderNumberById={
                      result().rows.find((row) => row.voucher.id === voucher().id)?.orderNumberById ?? new Map()
                    }
                    canEdit={canEdit()}
                    state={state}
                    onOpenChange={detailOpenChange}
                  />
                )}
              </Show>
            </div>
          </Show>
        )}
      </Show>
    </div>
  )
}
