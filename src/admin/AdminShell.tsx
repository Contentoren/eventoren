import type { JSX } from "solid-js"
import { adminListViewPreferenceContext } from "#src/viewPreference/adminListViewPreferenceContext.ts"
import { Sidebar } from "#ui/interactive/sidebar/Sidebar.jsx"
import { SidebarToggle } from "#ui/interactive/sidebar/SidebarToggle.jsx"
import { AdminSidebarContent } from "./AdminSidebarContent.tsx"
import { adminShellStateCreate } from "./adminShellStateCreate.ts"
import { adminSidebarContext } from "./adminSidebarContext.ts"

export function AdminShell(props: { readonly children: JSX.Element; readonly area?: "admin" | "organizer" }) {
  const state = adminShellStateCreate(props.area)

  return (
    <adminListViewPreferenceContext.Provider value={state.listViewPreference}>
      <adminSidebarContext.Provider
        value={{
          open: state.sidebarOpen,
          renderContent: () => (
            <AdminSidebarContent state={state} showListViewControl={props.area !== "organizer" || state.isAdmin()} />
          ),
        }}
      >
        <div class="admin-workspace flex min-h-dvh bg-surface-base text-content">
          <Sidebar
            state={state.sidebarState}
            title={props.area === "organizer" && !state.isAdmin() ? "Veranstalter-Navigation" : "Admin-Navigation"}
            titleClass="sr-only"
            innerClass="admin-workspace w-[min(22rem,calc(100vw-2rem))] border-0 bg-[color-mix(in_srgb,var(--color-surface-muted)_50%,var(--color-surface-base))] p-5 text-content shadow-lg shadow-slate-900/10 dark:bg-[color-mix(in_srgb,var(--color-slate-900)_50%,var(--color-surface-base))] dark:shadow-black/25 [&>header>button]:border-0"
            desktopChildren={
              <aside class="sticky top-0 self-start flex h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-surface-muted/50 p-4 dark:bg-slate-900/50">
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
              class={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-20 min-h-12 min-w-12 rounded-xl border-0 bg-white/80 text-content shadow-sm shadow-slate-900/10 backdrop-blur-xl hover:bg-white/90 dark:bg-slate-900/80 dark:shadow-black/20 dark:hover:bg-slate-800/90 ${state.isOrganizerEventDetail() ? "max-md:hidden" : ""}`}
            />
            <div class="min-w-0 flex-1">{props.children}</div>
          </div>
        </div>
      </adminSidebarContext.Provider>
    </adminListViewPreferenceContext.Provider>
  )
}
