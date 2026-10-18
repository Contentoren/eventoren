import { For, Show } from "solid-js"
import { mdiDotsVertical } from "@adaptive-ds/mdi/mdiDotsVertical.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import type { DashGuestQuota } from "../../../model/dashGuestQuotaSchema.ts"
/** Kontingent-Karten: Name, Fortschritt „belegt / Limit“, Menü für Bearbeiten/Löschen. */
export function DashGuestsQuotaCards(p: {
  quotas: DashGuestQuota[]
  usedByQuota: Map<string, number>
  canEdit: boolean
  onAdd: () => void
  onEdit: (quota: DashGuestQuota) => void
  onDelete: (quota: DashGuestQuota) => void
}) {
  return (
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <For each={p.quotas}>
        {(quota) => {
          const used = () => p.usedByQuota.get(quota.id) ?? 0
          const overCapacity = () => used() > quota.limit
          return (
            <div class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-4">
              <div class="flex items-start justify-between gap-2">
                <p class="min-w-0 truncate text-sm font-semibold text-content">{quota.name}</p>
                <Show when={p.canEdit}>
                  <DropdownMenu
                    triggerIcon={mdiDotsVertical}
                    triggerAriaLabel={`Aktionen für ${quota.name}`}
                    items={[
                      {
                        type: "item",
                        id: "bearbeiten",
                        label: "Bearbeiten",
                        onSelect: () => p.onEdit(quota),
                      },
                      {
                        type: "item",
                        id: "loeschen",
                        label: "Löschen",
                        tone: "danger",
                        onSelect: () => p.onDelete(quota),
                      },
                    ]}
                  />
                </Show>
              </div>
              <ProgressBar
                value={used()}
                max={Math.max(quota.limit, 1)}
                tone={overCapacity() ? "danger" : undefined}
                label={`${quota.name}: ${used()} von ${quota.limit} belegt`}
              />
              <p class="text-sm tabular-nums text-content-muted">
                {used()} / {quota.limit}
                <Show when={overCapacity()}>
                  <span class="ml-1 font-medium text-danger"> – voll</span>
                </Show>
              </p>
            </div>
          )
        }}
      </For>
      <Show when={p.canEdit}>
        <Button
          type="button"
          variant="outline"
          class="min-h-28 flex-col gap-1 border-dashed p-4 text-sm"
          onClick={p.onAdd}
        >
          <span class="text-lg leading-none" aria-hidden="true">
            +
          </span>
          Kontingent hinzufügen
        </Button>
      </Show>
    </div>
  )
}
