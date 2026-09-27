import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { AdminListViewControl } from "#src/viewPreference/AdminListViewControl.tsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ThemeButton } from "#ui/interactive/theme/ThemeButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { adminShellStateCreate } from "./adminShellStateCreate.ts"

type AdminShellState = ReturnType<typeof adminShellStateCreate>

export function AdminSidebarContent(props: {
  readonly state: AdminShellState
  readonly showListViewControl?: boolean
}) {
  return (
    <div class="flex min-h-full flex-1 flex-col gap-6">
      <Link
        to={props.state.navigation()[0].href}
        onClick={props.state.profileClose}
        class="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight text-content"
      >
        eventoren
      </Link>

      <nav
        aria-label={props.state.areaLabel() === "Admin" ? "Admin-Navigation" : "Veranstalter-Navigation"}
        class="pt-5"
      >
        <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">Navigation</p>
        <ul class="flex flex-col gap-1">
          <For each={props.state.navigation()}>
            {(item) => (
              <li>
                <Link
                  to={item.href}
                  onClick={props.state.profileClose}
                  aria-current={props.state.activeNavigationHref() === item.href ? "page" : undefined}
                  class={`focus-ring flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                    props.state.activeNavigationHref() === item.href
                      ? "bg-brand-soft text-brand-accent"
                      : "text-content-muted hover:bg-surface-muted hover:text-content"
                  }`}
                >
                  <Icon path={item.icon} class="size-5 shrink-0" />
                  <span class="truncate">{item.label}</span>
                </Link>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <footer class="mt-auto pt-5">
        <Show when={props.state.user()}>
          {(user) => (
            <div class="flex flex-col gap-4">
              <div>
                <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">Konto</p>
                <div class="flex min-w-0 items-center gap-3 rounded-control bg-surface-base/80 p-3 dark:bg-slate-800/60">
                  <Icon path={mdiAccountOutline} class="size-5 shrink-0 text-content-muted" />
                  <div class="min-w-0">
                    <p class="m-0 truncate text-sm font-semibold">{user().name}</p>
                    <p class="m-0 truncate text-xs text-content-muted">{user().email ?? "—"}</p>
                    <span class="mt-1 inline-block rounded-full bg-surface-base px-2 py-0.5 text-xs font-medium text-content-muted">
                      {props.state.areaLabel()}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <ThemeButton
                  showText
                  class="min-h-11 w-full justify-center rounded-control bg-surface-base/80 px-2.5 dark:bg-slate-800/60"
                />
                {props.showListViewControl !== false && (
                  <AdminListViewControl preference={props.state.listViewPreference} />
                )}
                <form onSubmit={props.state.logout}>
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    class="min-h-11 w-full justify-center gap-2 border-0 bg-surface-base/80 dark:bg-slate-800/60"
                  >
                    <Icon path={mdiLogout} class="size-5" />
                    Abmelden
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Show>
      </footer>
    </div>
  )
}
