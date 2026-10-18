import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import type { DashMobileTabEntry } from "./dashMobileTabsCreate.tsx"

export function DashMobileTabBar(p: { tabs: DashMobileTabEntry[]; onMore: () => void }) {
  return (
    <nav
      aria-label="Dashboard-Bereiche"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div class="grid h-16 grid-cols-5">
        <For each={p.tabs}>
          {(tab) => (
            <Link
              to={tab.to}
              aria-label={tab.label}
              aria-current={tab.active ? "page" : undefined}
              activeOptions={{ exact: tab.to === "/demo/dashboard" }}
              class="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-none text-[11px]"
            >
              <span class={tab.active ? "text-brand" : "text-content-muted"}>{tab.icon}</span>
              <span class={tab.active ? "font-medium text-brand" : "text-content-muted"}>{tab.label}</span>
            </Link>
          )}
        </For>
        <span
          role="button"
          tabindex="0"
          aria-label="Mehr öffnen"
          onClick={p.onMore}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") p.onMore()
          }}
          class="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-none text-[11px]"
        >
          <span class="text-content-muted">{mdiDotsHorizontalIcon()}</span>
          <span class="text-content-muted">Mehr</span>
        </span>
      </div>
    </nav>
  )
  function mdiDotsHorizontalIcon() {
    return (
      <svg viewBox="0 0 24 24" class="size-6 shrink-0 align-middle fill-current" aria-hidden="true">
        <path d={mdiDotsHorizontal} />
      </svg>
    )
  }
}

export function DashMobileMoreButton(p: { visible: () => boolean }) {
  return (
    <Show when={p.visible()} fallback={null}>
      <span />
    </Show>
  )
}
