import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiFileSearchOutline } from "@adaptive-ds/mdi/mdiFileSearchOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { TabNav } from "#ui/interactive/tabs/TabNav.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import type { DashEventsTab } from "../model/dashEventListFilter.ts"
import { dashEventsPageStateCreate, type DashEventsSearch } from "../dashEventsPageStateCreate.ts"
import { DashEventsList } from "./DashEventsList.tsx"
import { DashEventsTemplates } from "./DashEventsTemplates.tsx"
import { DashEventsTiles } from "./DashEventsTiles.tsx"
import { DashEventsToolbar } from "./DashEventsToolbar.tsx"
import { dashEventsTemplatesStateCreate } from "./dashEventsTemplatesStateCreate.ts"

export interface DashEventsPageProps {
  search: () => DashEventsSearch
  onPatch: (patch: Partial<DashEventsSearch>) => void
}

const tabLabels: Record<DashEventsTab, string> = {
  aktuell: "Aktuell",
  entwuerfe: "Entwürfe",
  vergangen: "Vergangen",
  vorlagen: "Vorlagen",
}

const emptyCopy: Record<DashEventsTab, { title: string; description: string }> = {
  aktuell: { title: "Keine aktuellen Events", description: "Erstelle dein erstes Event." },
  entwuerfe: { title: "Keine Entwürfe", description: "Entwürfe erscheinen hier, bis du sie veröffentlichst." },
  vergangen: { title: "Keine vergangenen Events", description: "Beendete und abgesagte Events landen hier." },
  vorlagen: { title: "Noch keine Vorlagen", description: "Speichere ein Event als Vorlage über die Aktionen." },
}

const emptyFor = (tab: DashEventsTab) => emptyCopy[tab] ?? emptyCopy.aktuell

/** Events-Liste mit Tabs, Toolbar, Listen-/Kachelansicht und Vorlagen-Tab. */
export function DashEventsPage(p: DashEventsPageProps) {
  const state = dashEventsPageStateCreate({ search: p.search, onPatch: p.onPatch })
  const templatesState = dashEventsTemplatesStateCreate({ templates: () => state.templates() })

  return (
    <div>
      <DashPageHeader
        title="Events"
        description="Aktuell, Entwürfe, vergangen und Vorlagen."
        actions={
          <Show when={state.canEdit()}>
            <span class="inline-flex items-center">
              <Button
                type="button"
                variant={buttonVariant.contrast}
                class="h-9 gap-1.5 rounded-r-none px-3 text-sm"
                onClick={state.createNew}
              >
                <Icon path={mdiPlus} class="size-4" />
                Event erstellen
              </Button>
              <DropdownMenu
                items={[
                  { type: "item", id: "leer", label: "Leeres Event", onSelect: state.createNew },
                  { type: "item", id: "vorlage", label: "Aus Vorlage …", onSelect: state.createFromTemplate },
                ]}
                triggerIcon={mdiChevronDown}
                triggerAriaLabel="Event-Erstellung wählen"
                triggerVariant={buttonVariant.contrast}
                class="rounded-l-none border-l border-white/25 px-2"
              />
            </span>
          </Show>
        }
      />
      <div class="border-b border-border-subtle">
        <TabNav
          ariaLabel="Events filtern"
          active={state.tab()}
          onSelect={(id) => state.selectTab(id as DashEventsTab)}
          items={(["aktuell", "entwuerfe", "vergangen", "vorlagen"] as const).map((tab) => ({
            id: tab,
            label: tabLabels[tab] ?? tab,
            count: state.counts()[tab],
          }))}
        />
      </div>
      <div class="mt-4">
        <Show when={state.tab() !== "vorlagen"} fallback={<DashEventsTemplates state={templatesState} />}>
          <div class="flex flex-col gap-4">
            <DashEventsToolbar
              q={state.qDraft.get()}
              onQ={state.setQ}
              categories={state.categories()}
              activeCategory={state.category.get()}
              onCategory={state.selectCategory}
              ansicht={state.ansicht()}
              onAnsicht={state.setAnsicht}
            />
            <Show
              when={state.rows().length > 0}
              fallback={
                <div class="rounded-card border border-border-subtle bg-surface">
                  <Show
                    when={state.hasFilter()}
                    fallback={
                      <EmptyState
                        icon={mdiCalendarPlus}
                        title={emptyFor(state.tab()).title}
                        description={emptyFor(state.tab()).description}
                      />
                    }
                  >
                    <EmptyState
                      icon={mdiFileSearchOutline}
                      title="Keine Treffer"
                      description="Passe Suche oder Filter an."
                      actions={
                        <Button
                          type="button"
                          variant={buttonVariant.outline}
                          class="h-9 px-3 text-sm"
                          onClick={state.resetFilters}
                        >
                          Filter zurücksetzen
                        </Button>
                      }
                    />
                  </Show>
                </div>
              }
            >
              <Show when={state.ansicht() === "liste"} fallback={<DashEventsTiles state={state} rows={state.rows()} />}>
                <DashEventsList state={state} rows={state.rows()} />
              </Show>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}
