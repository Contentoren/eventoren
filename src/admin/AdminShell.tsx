import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { Link } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { AdminListViewControl } from "#src/viewPreference/AdminListViewControl.tsx"
import { adminListViewPreferenceContext } from "#src/viewPreference/adminListViewPreferenceContext.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Sidebar } from "#ui/interactive/sidebar/Sidebar.jsx"
import { SidebarToggle } from "#ui/interactive/sidebar/SidebarToggle.jsx"
import { ThemeButton } from "#ui/interactive/theme/ThemeButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { adminShellStateCreate } from "./adminShellStateCreate.ts"

type AdminShellState = ReturnType<typeof adminShellStateCreate>

export function AdminShell(props: { readonly children: JSX.Element; readonly area?: "admin" | "organizer" }) {
  const state = adminShellStateCreate(props.area)

  return (
    <adminListViewPreferenceContext.Provider value={state.listViewPreference}>
      <div class="flex min-h-dvh bg-surface-base text-content">
        <Sidebar
          state={state.sidebarState}
          title={props.area === "organizer" ? "Veranstalter-Navigation" : "Admin-Navigation"}
          description={
            props.area === "organizer" ? "Navigation für Veranstalter" : "Navigation für die Eventoren-Verwaltung"
          }
          desktopChildren={
            <aside class="sticky top-0 self-start flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-base p-4">
              <AdminSidebarContent state={state} />
            </aside>
          }
          mobileChildren={<AdminSidebarContent state={state} />}
        />
        <div class="flex min-w-0 flex-1 flex-col">
          <Show
            when={props.area === "organizer"}
            fallback={
              <SidebarToggle
                {...state.sidebarState}
                variant="outline"
                class="fixed bottom-4 right-4 z-20 bg-surface-base shadow-md"
              />
            }
          >
            <header class="sticky top-0 z-20 flex min-h-14 items-center gap-3 border-b border-border bg-surface-base/90 px-4 py-2 backdrop-blur-xl">
              <SidebarToggle {...state.sidebarState} variant="ghost" />
              <Icon path={state.activeNavigationItem().icon} class="size-5 shrink-0 text-content-muted" />
              <h1 class="truncate text-base font-semibold">{state.activeNavigationItem().label}</h1>
            </header>
          </Show>
          <div class="min-w-0 flex-1">{props.children}</div>
        </div>
      </div>
    </adminListViewPreferenceContext.Provider>
  )
}

function AdminSidebarContent(props: { readonly state: AdminShellState }) {
  return (
    <div class="flex min-h-full flex-1 flex-col gap-6">
      <Link to={props.state.navigation[0].href} class="px-2 text-lg font-semibold tracking-tight text-content">
        eventoren
        <span class="ml-2 text-sm font-medium text-content-muted">{props.state.areaLabel}</span>
      </Link>

      <nav aria-label={props.state.areaLabel === "Admin" ? "Admin-Navigation" : "Veranstalter-Navigation"}>
        <ul class="flex flex-col gap-1">
          <For each={props.state.navigation}>
            {(item) => (
              <li>
                <Link
                  to={item.href}
                  aria-current={props.state.activeNavigationHref() === item.href ? "page" : undefined}
                  class={`focus-ring flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition-colors ${
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

      <footer class="mt-auto flex flex-col gap-2 border-t border-border pt-4">
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
                <ThemeButton showText class="w-full justify-center rounded-control px-2.5" />
                <AdminListViewControl preference={props.state.listViewPreference} />
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
