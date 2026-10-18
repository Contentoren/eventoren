import { For, Show } from "solid-js"
import { tabNavStateCreate } from "#ui/interactive/tabs/tabNavStateCreate.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export interface TabNavItem {
  id: string
  label: string
  icon?: string
  count?: number
}

export interface TabNavProps extends MayHaveClass {
  items: TabNavItem[]
  active: string
  onSelect: (id: string) => void
  ariaLabel: string
}

/** Unterstrich-Tabs als Tabliste mit Pfeiltasten und mobilem Scroll. */
export function TabNav(p: TabNavProps) {
  const state = tabNavStateCreate({ ids: () => p.items.map((item) => item.id), onSelect: p.onSelect })

  return (
    <div role="tablist" aria-label={p.ariaLabel} class={state.rootClass(p.class)}>
      <For each={p.items}>
        {(item, index) => {
          const selected = () => p.active === item.id
          return (
            <button
              type="button"
              role="tab"
              aria-selected={selected()}
              tabindex={selected() ? 0 : -1}
              data-tabnav-index={index()}
              onClick={() => p.onSelect(item.id)}
              onKeyDown={(event) => state.onKeyDown(event, index())}
              class={state.tabClass(selected())}
            >
              <Show when={item.icon}>{(icon) => <Icon path={icon()} class="size-4 shrink-0" />}</Show>
              <span>{item.label}</span>
              <Show when={item.count !== undefined}>
                <span class="rounded-full bg-surface-muted px-1.5 text-xs font-semibold tabular-nums">
                  {item.count}
                </span>
              </Show>
            </button>
          )
        }}
      </For>
    </div>
  )
}
