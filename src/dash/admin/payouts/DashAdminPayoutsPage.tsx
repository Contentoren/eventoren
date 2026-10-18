import { For, Show } from "solid-js"
import { mdiBankTransfer } from "@adaptive-ds/mdi/mdiBankTransfer.js"
import { mdiCalendarClockOutline } from "@adaptive-ds/mdi/mdiCalendarClockOutline.js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiDownloadOutline } from "@adaptive-ds/mdi/mdiDownloadOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashIbanMask } from "../../model/dashIbanMask.ts"
import { dashCsvCreate } from "../../export/dashCsvCreate.ts"
import { dashDownload } from "../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../export/dashFileNameCreate.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashAdminPayoutMarkPaid } from "../../store/actions/admin/dashAdminPayoutMarkPaid.ts"
import { DashKpiCard } from "../../ui/kpi/DashKpiCard.tsx"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashPageHeader } from "../../ui/DashPageHeader.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { DashSettlementView } from "../../pages/finance/ui/DashSettlementView.tsx"
import {
  dashAdminPayoutsStateCreate,
  type DashAdminPayoutRow,
  type DashAdminPayoutsSearch,
  type DashAdminPayoutStatusFilter,
} from "./dashAdminPayoutsStateCreate.ts"
import { DashAdminPayoutsList } from "./DashAdminPayoutsList.tsx"

const statusChips: { value: DashAdminPayoutStatusFilter; label: string; tone?: "warning" }[] = [
  { value: "bereit", label: "Bereit", tone: "warning" },
  { value: "geplant", label: "Geplant" },
  { value: "ausgezahlt", label: "Ausgezahlt" },
  { value: "alle", label: "Alle" },
]

/** Admin-Seite aller Auszahlungen mit Filter-Chips, Mehrfachaktion und Abrechnungs-Sheet. */
export function DashAdminPayoutsPage(p: {
  search: () => DashAdminPayoutsSearch
  onPatch: (patch: Partial<DashAdminPayoutsSearch>) => void
}) {
  const state = dashAdminPayoutsStateCreate({ search: p.search })
  const now = dashNow()

  const openRow = (row: DashAdminPayoutRow) => p.onPatch({ auszahlung: row.payout.id })
  const closeSheet = () => p.onPatch({ auszahlung: "" })

  const confirmMarkPaid = (ids: string[]) => {
    const result = dashAdminPayoutMarkPaid(ids)
    state.confirmOpen.set(false)
    if (result.success) {
      toastAdd({
        title: `${result.data.updated} ${result.data.updated === 1 ? "Auszahlung" : "Auszahlungen"} als ausgezahlt markiert`,
        variant: "success",
      })
      state.selectedKeys.set([])
    } else {
      toastAdd({ title: result.errorMessage, variant: "error" })
    }
  }

  const exportSepa = () => {
    const selected = state.selectedReady()
    if (selected.length === 0) {
      toastAdd({ title: "Keine bereite Auszahlung ausgewählt.", variant: "error" })
      return
    }
    const header = ["Empfänger", "IBAN", "Betrag", "Verwendungszweck"]
    const rows = selected.map((row) => [
      row.orgName,
      row.orgIban,
      dashCentsFormat(row.payout.amountCents),
      `Eventoren Auszahlung ${row.eventTitle} ${row.payout.reference}`,
    ])
    dashDownload(
      dashFileNameCreate(["sepa", "auszahlungen"], "csv", now()),
      dashCsvCreate(header, rows),
      "text/csv;charset=utf-8",
    )
    toastAdd({ title: "SEPA-Export erstellt (Demo)", variant: "success" })
  }

  const markActivePaid = () => {
    const active = state.activePayout()
    if (!active) return
    confirmMarkPaid([active.payout.id])
  }

  return (
    <div class="flex flex-col gap-4">
      <DashPageHeader
        title="Auszahlungen"
        description="Alle Auszahlungen an Veranstalter mit Fälligkeit, Status und Abrechnung."
      />
      <div class="grid gap-3 sm:grid-cols-3">
        <DashKpiCard
          label="Bereit"
          value={dashCentsFormat(state.kpiReady().sum)}
          icon={mdiCashMultiple}
          class="h-full"
          footer={
            <span class="text-xs text-content-muted">
              {state.kpiReady().count} {state.kpiReady().count === 1 ? "Auszahlung" : "Auszahlungen"}
            </span>
          }
        />
        <DashKpiCard
          label="Geplant"
          value={dashCentsFormat(state.kpiPlanned())}
          icon={mdiCalendarClockOutline}
          class="h-full"
        />
        <DashKpiCard
          label="Ausgezahlt (30 Tage)"
          value={dashCentsFormat(state.paidLast30Days())}
          icon={mdiBankTransfer}
          class="h-full"
        />
      </div>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Status filtern">
        <For each={statusChips}>
          {(chip) => (
            <FilterChip
              active={p.search().status === chip.value}
              onClick={() => p.onPatch({ status: chip.value })}
              count={state.counts()[chip.value]}
              tone={chip.tone}
            >
              {chip.label}
            </FilterChip>
          )}
        </For>
      </div>
      <DashAdminPayoutsList
        rows={state.filtered}
        selectedKeys={state.selectedKeys.get}
        onSelectedKeysChange={(keys) => {
          const readyIds = new Set(
            state
              .filtered()
              .filter((row) => row.payout.status === "bereit")
              .map((row) => row.payout.id),
          )
          state.selectedKeys.set(keys.filter((key) => readyIds.has(key)))
        }}
        onSelect={openRow}
        bulkActions={(keys) => {
          const ready = state.selectedReady()
          return (
            <span class="inline-flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={buttonVariant.contrast}
                size="sm"
                class="h-9 px-3 text-sm"
                disabled={ready.length === 0}
                onClick={() => state.confirmOpen.set(true)}
              >
                <Icon path={mdiCheck} class="size-4" />
                Als ausgezahlt markieren
              </Button>
              <Button
                type="button"
                variant={buttonVariant.outline}
                size="sm"
                class="h-9 px-3 text-sm"
                disabled={ready.length === 0}
                onClick={exportSepa}
              >
                <Icon path={mdiDownloadOutline} class="size-4" />
                SEPA-Datei exportieren
                <Show when={ready.length === 0 && keys.length > 0}>
                  <span class="sr-only"> (nur bereite Zeilen)</span>
                </Show>
              </Button>
            </span>
          )
        }}
        empty={<span>Keine Auszahlungen in diesem Status.</span>}
      />
      <ConfirmDialog
        open={state.confirmOpen.get()}
        onOpenChange={state.confirmOpen.set}
        title={state.selectedLabel()}
        description="Die Auszahlungen werden als ausgezahlt gespeichert und erscheinen im Protokoll."
        confirmLabel="Markieren"
        tone="brand"
        onConfirm={() => confirmMarkPaid(state.selectedReady().map((row) => row.payout.id))}
      />
      <Sheet
        open={state.activePayout() !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet()
        }}
        size="xl"
        title={state.activePayout()?.eventTitle ?? "Abrechnung"}
        description={state.activePayout() ? `Auszahlung ${state.activePayout()?.payout.reference}` : undefined}
        headerActions={
          state.activePayout() ? (
            <DashStatusPill kind="payout" value={state.activePayout()?.payout.status ?? "geplant"} size="sm" />
          ) : undefined
        }
        footer={
          state.activePayout()?.payout.status === "bereit" ? (
            <Button type="button" variant={buttonVariant.contrast} class="h-9 px-3 text-sm" onClick={markActivePaid}>
              <Icon path={mdiCheck} class="size-4" />
              Als ausgezahlt markieren
            </Button>
          ) : undefined
        }
      >
        <Show when={state.activePayout()}>
          {(row) => (
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-center gap-3 rounded-card border border-border-subtle bg-surface-muted p-4">
                <DashOrgLogo name={row().orgName} logoDataUrl={row().orgLogo} size="md" />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-content">{row().orgName}</p>
                  <p class="truncate text-sm text-content-muted">
                    {dashDateFormat(row().eventEndsAt, "datum")} · fällig {dashDateFormat(row().payout.dueAt, "datum")}{" "}
                    · {dashIbanMask(row().orgIban)}
                  </p>
                </div>
                <DashMoney cents={row().payout.amountCents} class="text-lg font-semibold" />
              </div>
              <DashSettlementView eventId={row().payout.eventId} readOnly />
            </div>
          )}
        </Show>
      </Sheet>
    </div>
  )
}
