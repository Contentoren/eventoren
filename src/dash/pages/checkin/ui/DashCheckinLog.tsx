import { For, Show } from "solid-js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { mdiCloseCircle } from "@adaptive-ds/mdi/mdiCloseCircle.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { dashCheckinScanFilter, dashCheckinRejectionLabels } from "../model/dashCheckinScanFilter.ts"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"

const berlinTime = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Berlin",
})

/** Scan-Protokoll: Filter-Chips je Status und Liste der neuesten Scans. */
export function DashCheckinLog(p: { state: DashCheckinPageState }) {
  const scans = () => {
    const filtered = dashCheckinScanFilter(p.state.eventScans(), p.state.scansFilter())
    return filtered.slice(0, 50)
  }
  const ticketsById = () => new Map(dashStateGet().tickets.map((ticket) => [ticket.id, ticket] as const))
  const accepted = () => dashCheckinScanFilter(p.state.eventScans(), "akzeptiert").length
  const rejected = () => dashCheckinScanFilter(p.state.eventScans(), "abgelehnt").length
  const holderName = (ticketId: string | null, code: string) => {
    if (!ticketId) return null
    return ticketsById().get(ticketId)?.holderName ?? code
  }

  return (
    <DashSection
      title="Scan-Protokoll"
      description="Neueste Scans zuerst, höchstens 50 Einträge."
      actions={
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Scans filtern">
          <FilterChip active={p.state.scansFilter() === "alle"} onClick={() => p.state.setScans("alle")}>
            Alle
          </FilterChip>
          <FilterChip
            active={p.state.scansFilter() === "akzeptiert"}
            onClick={() => p.state.setScans("akzeptiert")}
            count={accepted()}
          >
            Akzeptiert
          </FilterChip>
          <FilterChip
            active={p.state.scansFilter() === "abgelehnt"}
            onClick={() => p.state.setScans("abgelehnt")}
            count={rejected()}
            tone="danger"
          >
            Abgelehnt
          </FilterChip>
        </div>
      }
    >
      <Show
        when={scans().length > 0}
        fallback={
          <EmptyState icon={mdiQrcodeScan} title="Noch keine Scans" description="Scans erscheinen hier live." />
        }
      >
        <ol class="flex flex-col divide-y divide-border-subtle">
          <For each={scans()}>
            {(scan) => (
              <li class="flex items-center gap-3 py-2.5">
                <Icon
                  path={scan.result === "ok" ? mdiCheckCircle : mdiCloseCircle}
                  class={scan.result === "ok" ? "size-5 shrink-0 text-success" : "size-5 shrink-0 text-danger"}
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-content">
                    <Show when={holderName(scan.ticketId, scan.code)} fallback={scan.code}>
                      {(name) => <span class="font-medium">{name()}</span>}
                    </Show>{" "}
                    <span class="font-mono text-content-muted">{scan.code}</span>
                  </p>
                  <p class="truncate text-xs text-content-muted">
                    {scan.entrance} · {scan.device}
                    <Show when={scan.result !== "ok"}>
                      <span>
                        {" "}
                        · {dashCheckinRejectionLabels[scan.result as keyof typeof dashCheckinRejectionLabels]}
                      </span>
                    </Show>
                  </p>
                </div>
                <time datetime={scan.at} class="shrink-0 text-xs text-content-muted tabular-nums">
                  {berlinTime.format(new Date(scan.at))}
                </time>
                <DashStatusPill kind="scan" value={scan.result} size="sm" />
              </li>
            )}
          </For>
        </ol>
      </Show>
    </DashSection>
  )
}
