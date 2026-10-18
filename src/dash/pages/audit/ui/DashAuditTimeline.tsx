import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiFilterOutline } from "@adaptive-ds/mdi/mdiFilterOutline.js"
import { mdiHistory } from "@adaptive-ds/mdi/mdiHistory.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Avatar } from "#ui/static/avatar/Avatar.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import { dashAuditTimelineStateCreate } from "./dashAuditTimelineStateCreate.ts"

/** Protokoll-Timeline: gruppiert nach Berliner Tag, mit Bereichs-Chips und Personen-Filter. */
export function DashAuditTimeline(p: {
  orgId: string
  eventId?: string | null
  area: DashAuditArea | null
  person: string | null
  onArea: (value: DashAuditArea | null) => void
  onPerson: (value: string | null) => void
}) {
  const state = dashAuditTimelineStateCreate({
    orgId: () => p.orgId,
    eventId: () => p.eventId ?? null,
    now: () => new Date(),
    area: () => p.area,
    person: () => p.person,
    onArea: p.onArea,
    onPerson: p.onPerson,
  })

  return (
    <div class="flex flex-col gap-4">
      <Show when={state.scoped().length > 0}>
        <div class="flex flex-col gap-3">
          <fieldset class="flex flex-wrap items-center gap-1.5">
            <legend class="sr-only">Nach Bereich filtern</legend>
            <FilterChip active={p.area === null} onClick={() => state.selectArea(null)}>
              Alle
            </FilterChip>
            <For each={state.meta().areas}>
              {(item) => (
                <FilterChip
                  active={p.area === item.area}
                  onClick={() => state.selectArea(p.area === item.area ? null : item.area)}
                  count={item.count}
                >
                  {state.areaLabels[item.area]}
                </FilterChip>
              )}
            </For>
          </fieldset>
          <div class="flex flex-wrap items-center gap-2">
            <DropdownMenu
              items={[
                { type: "item" as const, id: "alle", label: "Alle Personen", onSelect: () => state.selectPerson(null) },
                ...state.meta().actors.map((entry) => ({
                  type: "item" as const,
                  id: entry.actor,
                  label: `${entry.actor} (${entry.count})`,
                  onSelect: () => state.selectPerson(entry.actor),
                })),
              ]}
              triggerLabel={state.personLabel()}
              triggerIcon={p.person ? mdiAccountOutline : mdiFilterOutline}
              triggerAriaLabel="Nach Person filtern"
            />
            <Show when={p.person !== null}>
              <Button
                type="button"
                variant={buttonVariant.link}
                class="h-auto px-0 text-sm"
                onClick={() => state.selectPerson(null)}
              >
                Zurücksetzen
              </Button>
            </Show>
          </div>
        </div>
      </Show>
      <Show
        when={state.visibleCount() > 0}
        fallback={
          <div class="rounded-card border border-border-subtle bg-surface">
            <EmptyState
              icon={mdiHistory}
              title="Noch keine Änderungen"
              description="Sobald du etwas änderst, steht es hier im Protokoll."
            />
          </div>
        }
      >
        <div class="flex flex-col gap-5">
          <For each={state.visibleGroups()}>
            {(group) => (
              <section aria-label={group.label}>
                <h3 class="mb-2 text-xs font-semibold tracking-wide text-content-muted uppercase">{group.label}</h3>
                <ol class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-3 sm:p-4">
                  <For each={group.entries}>
                    {(entry) => (
                      <li class="flex items-start gap-3 border-b border-border-subtle py-2 first:pt-0 last:border-b-0 last:pb-0">
                        <Avatar name={entry.actor} size="xs" />
                        <div class="min-w-0 flex-1">
                          <p class="text-sm text-content">
                            <strong class="font-semibold">{entry.actor}</strong> {` ${entry.action}`}
                          </p>
                          <div class="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                            <span class="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-content-muted">
                              {state.areaLabels[entry.area]}
                            </span>
                            <Show when={entry.before !== null || entry.after !== null}>
                              <Show when={entry.before !== null}>
                                <span class="rounded bg-danger-soft/40 px-1.5 py-0.5 text-danger line-through">
                                  {entry.before ?? ""}
                                </span>
                              </Show>
                              <Show when={entry.before !== null && entry.after !== null}>
                                <Icon path={mdiHistory} class="size-3 text-content-muted" />
                              </Show>
                              <Show when={entry.after !== null}>
                                <span class="rounded bg-success-soft px-1.5 py-0.5 font-medium text-success">
                                  {entry.after ?? ""}
                                </span>
                              </Show>
                            </Show>
                          </div>
                        </div>
                        <DashRelativeTime
                          iso={entry.at}
                          class="shrink-0 text-xs whitespace-nowrap text-content-muted"
                        />
                      </li>
                    )}
                  </For>
                </ol>
              </section>
            )}
          </For>
        </div>
      </Show>
      <Show when={state.hasMore()}>
        <div class="flex justify-center">
          <Button type="button" variant={buttonVariant.outline} class="h-9 px-3 text-sm" onClick={state.more}>
            Mehr laden ({state.totalCount() - state.visibleCount()} weitere)
          </Button>
        </div>
      </Show>
    </div>
  )
}
