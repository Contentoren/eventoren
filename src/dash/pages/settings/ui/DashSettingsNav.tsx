import { For } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Sticky Anker-Navigation rechts (Desktop) für die Einstellungs-Sektionen. */
export function DashSettingsNav(p: { state: DashSettingsPageState }) {
  const scrollTo = (hash: string) => (event: MouseEvent) => {
    event.preventDefault()
    p.state.scrollToSection(hash.replace("#einstellungen-", ""))
  }

  return (
    <nav aria-label="Einstellungs-Abschnitte" class="sticky top-24 hidden min-w-0 lg:block">
      <ul class="flex flex-col gap-0.5 rounded-card border border-border-subtle bg-surface p-2">
        <For each={p.state.navItems()}>
          {(item) => (
            <li>
              <a
                href={item.hash}
                onClick={scrollTo(item.hash)}
                class={classMerge(
                  "block truncate rounded-control px-3 py-2 text-sm text-content-muted transition-colors",
                  "hover:bg-surface-muted hover:text-content",
                )}
              >
                {item.label}
              </a>
            </li>
          )}
        </For>
      </ul>
    </nav>
  )
}
