import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import Dialog from "@corvu/dialog"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { commandPaletteStateCreate } from "#ui/interactive/command/commandPaletteStateCreate.js"
import { classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type CommandPaletteItem = {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
  hint?: string
  onSelect: () => void
}

export type CommandPaletteGroup = {
  id: string
  label: string
  items: CommandPaletteItem[]
}

export type CommandPaletteProps = MayHaveClass & {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandPaletteGroup[]
  placeholder?: string
  emptyText?: string
}

const itemByRankedId = (groups: CommandPaletteGroup[], rankedId: string) => {
  const separator = rankedId.indexOf(":")
  if (separator < 0) return undefined
  const groupId = rankedId.slice(0, separator)
  const itemId = rankedId.slice(separator + 1)
  return groups.find((group) => group.id === groupId)?.items.find((item) => item.id === itemId)
}

const itemIconByRankedId = (groups: CommandPaletteGroup[], rankedId: string) => itemByRankedId(groups, rankedId)?.icon

const itemHintByRankedId = (groups: CommandPaletteGroup[], rankedId: string) => itemByRankedId(groups, rankedId)?.hint

/** Top-centered command palette: search with ↑/↓ wrap, Enter selects, hover sets active. */
export function CommandPalette(p: CommandPaletteProps) {
  const state = commandPaletteStateCreate({ groups: () => p.groups })

  const select = (rankedId: string) => {
    const item = itemByRankedId(p.groups, rankedId)
    if (!item) return
    state.setQuery("")
    p.onOpenChange(false)
    item.onSelect()
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      state.setQuery("")
      state.autofocus()
    }
    p.onOpenChange(open)
  }

  return (
    <Dialog open={p.open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content
          class={cn(
            "fixed left-1/2 top-[12vh] z-50 max-h-[60vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2",
            "flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface text-content shadow-lg",
            p.class,
          )}
          role="dialog"
          aria-label="Befehlspalette"
        >
          <div class="flex items-center gap-2 border-b border-border-subtle px-4">
            <Icon path={mdiMagnify} class="size-5 shrink-0 text-content-muted" />
            <input
              ref={state.registerInput}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-listbox"
              aria-label="Suchen oder Befehl eingeben"
              class="h-12 w-full bg-transparent text-sm text-content placeholder:text-content-muted focus:outline-none"
              placeholder={p.placeholder ?? "Suchen oder Befehl eingeben …"}
              value={state.query()}
              onInput={(event) => state.setQuery(event.currentTarget.value)}
              onKeyDown={(event) => state.handleSearchKeyDown(event, select)}
            />
            <kbd class="hidden shrink-0 rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-content-muted sm:block">
              Esc
            </kbd>
          </div>
          <div ref={state.registerList} id="command-palette-listbox" role="listbox" class="overflow-y-auto p-1.5">
            <Show
              when={state.rankedItems().length > 0}
              fallback={
                <p class="px-3 py-8 text-center text-sm text-content-muted">{p.emptyText ?? "Keine Treffer"}</p>
              }
            >
              <For each={state.visibleGroups()}>
                {(group) => (
                  <div>
                    <div
                      id={`command-group-${group.id}`}
                      class="px-3 pb-1 pt-2 text-xs font-semibold text-content-muted"
                    >
                      {group.label}
                    </div>
                    <For each={group.items}>
                      {(ranked) => {
                        const globalIndex = () => state.globalIndexOf(ranked.id)
                        const selected = () => state.activeIndex() === globalIndex()
                        return (
                          <div
                            role="option"
                            id={`command-option-${globalIndex()}`}
                            aria-selected={selected()}
                            aria-describedby={`command-group-${group.id}`}
                            data-command-option={ranked.id}
                            tabIndex={-1}
                            class={cn(
                              "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-content",
                              selected() && "bg-surface-muted",
                              "focus-visible:outline-2 focus-visible:outline-ring",
                            )}
                            onMouseEnter={() => state.setActiveById(ranked.id)}
                            onClick={() => select(ranked.id)}
                            onKeyDown={(event) => state.handleOptionKeyDown(event, ranked.id, select)}
                          >
                            <Show when={itemIconByRankedId(p.groups, ranked.id)}>
                              <Icon path={itemIconByRankedId(p.groups, ranked.id) ?? ""} class="size-4 shrink-0" />
                            </Show>
                            <span class="min-w-0 flex-1 truncate">
                              <span class="block truncate">{ranked.label}</span>
                              <Show when={ranked.description}>
                                <span class="block truncate text-xs text-content-muted">{ranked.description}</span>
                              </Show>
                            </span>
                            <Show when={itemHintByRankedId(p.groups, ranked.id)}>
                              <kbd class="shrink-0 rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-content-muted">
                                {itemHintByRankedId(p.groups, ranked.id)}
                              </kbd>
                            </Show>
                          </div>
                        )
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>
          <div class="flex items-center gap-4 border-t border-border-subtle px-4 py-2.5 text-xs text-content-muted">
            <span class="flex items-center gap-1.5">
              <kbd class="rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 font-medium">↑↓</kbd>
              Navigieren
            </span>
            <span class="flex items-center gap-1.5">
              <kbd class="rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 font-medium">↵</kbd>
              Öffnen
            </span>
            <span class="flex items-center gap-1.5">
              <kbd class="rounded border border-border-subtle bg-surface-muted px-1.5 py-0.5 font-medium">Esc</kbd>
              Schließen
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
