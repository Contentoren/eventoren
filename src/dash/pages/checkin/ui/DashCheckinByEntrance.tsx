import { For, Show } from "solid-js"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"

/** Einlass nach Eingang: Zähler für akzeptierte und abgelehnte Scans plus Geräte. */
export function DashCheckinByEntrance(p: { state: DashCheckinPageState }) {
  return (
    <DashSection title="Nach Eingang" description="Akzeptierte und abgelehnte Scans je Eingang.">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <For each={p.state.stats().byEntrance}>
          {(row) => (
            <div class="rounded-card border border-border-subtle bg-surface p-4">
              <p class="text-sm font-semibold text-content">{row.entrance}</p>
              <p class="mt-2 text-2xl font-semibold text-content tabular-nums">{row.ok}</p>
              <p class="text-sm text-content-muted">akzeptierte Scans</p>
              <p class="mt-1 text-sm text-content-muted">
                Abgelehnt:{" "}
                <span class={row.rejected > 0 ? "font-medium text-danger" : "tabular-nums"}>{row.rejected}</span>
              </p>
              <Show when={row.devices.length > 0}>
                <p class="mt-2 text-xs text-content-muted">Geräte: {row.devices.join(", ")}</p>
              </Show>
            </div>
          )}
        </For>
      </div>
    </DashSection>
  )
}
