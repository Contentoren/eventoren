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
import { adminSidebarContext } from "./adminSidebarContext.ts"
import { adminShellStateCreate } from "./adminShellStateCreate.ts"

type AdminShellState = ReturnType<typeof adminShellStateCreate>

export function AdminShell(props: { readonly children: JSX.Element; readonly area?: "admin" | "organizer" }) {
  const state = adminShellStateCreate(props.area)

  return (
    <adminListViewPreferenceContext.Provider value={state.listViewPreference}>
      <adminSidebarContext.Provider value={state.sidebarOpen}>
        <div class="flex min-h-dvh bg-surface-base text-content">
          <Sidebar
            state={state.sidebarState}
            title={props.area === "organizer" && !state.isAdmin() ? "Veranstalter-Navigation" : "Admin-Navigation"}
            titleClass="sr-only"
            innerClass="w-[min(22rem,calc(100vw-2rem))] border-border bg-surface-base p-5 text-content"
            desktopChildren={
              <aside class="sticky top-0 self-start flex h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface-base p-4">
                <AdminSidebarContent
                  state={state}
                  showListViewControl={props.area !== "organizer" || state.isAdmin()}
                />
              </aside>
            }
            mobileChildren={
              <AdminSidebarContent state={state} showListViewControl={props.area !== "organizer" || state.isAdmin()} />
            }
          />
          <div class="flex min-w-0 flex-1 flex-col">
            <SidebarToggle
              {...state.sidebarState}
              variant="outline"
              class={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-20 min-h-12 min-w-12 rounded-xl border-white/70 bg-white/65 text-content shadow-xl shadow-black/15 backdrop-blur-xl hover:bg-white/80 dark:border-white/20 dark:bg-slate-900/60 dark:hover:bg-slate-800/75 ${state.isOrganizerEventDetail() ? "max-md:hidden" : ""}`}
            />
            <div class="min-w-0 flex-1">{props.children}</div>
          </div>
        </div>
      </adminSidebarContext.Provider>
    </adminListViewPreferenceContext.Provider>
  )
}

function AdminSidebarContent(props: { readonly state: AdminShellState; readonly showListViewControl?: boolean }) {
  return (
    <div class="flex min-h-full flex-1 flex-col gap-6">
      <Link
        to={props.state.navigation()[0].href}
        class="flex items-center gap-2 px-2 text-lg font-semibold tracking-tight text-content"
      >
        eventoren
      </Link>

      <nav
        aria-label={props.state.areaLabel() === "Admin" ? "Admin-Navigation" : "Veranstalter-Navigation"}
        class="border-t border-border pt-5"
      >
        <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">Navigation</p>
        <ul class="flex flex-col gap-1">
          <For each={props.state.navigation()}>
            {(item) => (
              <li>
                <Link
                  to={item.href}
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

      <footer class="mt-auto border-t border-border pt-5">
        <Show when={props.state.user()}>
          {(user) => (
            <div class="flex flex-col gap-4">
              <div>
                <p class="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-content-muted">Konto</p>
                <div class="flex min-w-0 items-center gap-3 rounded-control bg-surface-muted p-3">
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
                <ThemeButton showText class="min-h-11 w-full justify-center rounded-control bg-surface-muted px-2.5" />
                {props.showListViewControl !== false && (
                  <AdminListViewControl preference={props.state.listViewPreference} />
                )}
                <form onSubmit={props.state.logout}>
                  <Button type="submit" variant="outline" size="sm" class="min-h-11 w-full justify-center gap-2">
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
