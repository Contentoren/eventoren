import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sidebar } from "#ui/interactive/sidebar/Sidebar.jsx"
import { SidebarToggle } from "#ui/interactive/sidebar/SidebarToggle.jsx"
import { ThemeButton } from "#ui/interactive/theme/ThemeButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { adminShellStateCreate } from "./adminShellStateCreate.ts"

type AdminShellState = ReturnType<typeof adminShellStateCreate>

export function AdminShell(props: { readonly children: JSX.Element }) {
  const state = adminShellStateCreate()

  return (
    <div class="flex min-h-dvh bg-surface-base text-content">
      <Sidebar
        state={state.sidebarState}
        title="Admin-Navigation"
        description="Navigation für die Eventoren-Verwaltung"
        desktopChildren={
          <aside class="sticky top-0 self-start flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-base p-4">
            <AdminSidebarContent state={state} />
          </aside>
        }
        mobileChildren={<AdminSidebarContent state={state} />}
      />
      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-border bg-surface-base/90 px-4 py-2 backdrop-blur-xl">
          <SidebarToggle {...state.sidebarState} variant="ghost" />
          <Icon path={state.activeNavigationItem().icon} class="size-5 shrink-0 text-content-muted" />
          <h1 class="truncate text-base font-semibold">{state.activeNavigationItem().label}</h1>
        </header>
        <div class="min-w-0 flex-1">{props.children}</div>
      </div>
    </div>
  )
}

function AdminSidebarContent(props: { readonly state: AdminShellState }) {
  return (
    <div class="flex min-h-full flex-1 flex-col gap-6">
      <Link to="/admin/bestellungen" class="px-2 text-lg font-semibold tracking-tight text-content">
        eventoren
        <span class="ml-2 text-sm font-medium text-content-muted">Admin</span>
      </Link>

      <nav aria-label="Admin-Navigation">
        <ul class="flex flex-col gap-1">
          <For each={props.state.navigation}>
            {(item) => (
              <li>
                <Link
                  to={item.href}
                  aria-current={props.state.activeNavigationItem().href === item.href ? "page" : undefined}
                  class="focus-ring flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors"
                  classList={{
                    "bg-brand-soft text-brand-accent": props.state.activeNavigationItem().href === item.href,
                    "text-content-muted hover:bg-surface-muted hover:text-content":
                      props.state.activeNavigationItem().href !== item.href,
                  }}
                >
                  <Icon path={item.icon} class="size-5 shrink-0" />
                  <span class="truncate">{item.label}</span>
                </Link>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <footer class="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <ThemeButton showText class="w-full justify-center rounded-control px-2.5" />
        <Show when={props.state.user()}>
          {(user) => (
            <details class="group relative">
              <summary
                class="focus-ring flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                aria-label="Benutzermenü"
              >
                <Icon path={mdiAccountOutline} class="size-5 shrink-0" />
                <span class="min-w-0 truncate">{user().name}</span>
              </summary>
              <div class="absolute bottom-full left-0 z-30 mb-2 flex min-w-56 flex-col gap-3 rounded-control border border-border bg-surface-base p-4 shadow-lg">
                <div class="min-w-0">
                  <p class="m-0 truncate font-medium">{user().name}</p>
                  <p class="m-0 truncate text-sm text-content-muted">{user().email ?? "—"}</p>
                </div>
                <form onSubmit={props.state.logout}>
                  <Button type="submit" variant="outline" size="sm" class="w-full justify-center gap-2">
                    <Icon path={mdiLogout} class="size-5" />
                    Abmelden
                  </Button>
                </form>
              </div>
            </details>
          )}
        </Show>
      </footer>
    </div>
  )
}
