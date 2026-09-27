import { type JSX, Show } from "solid-js"
import { adminListViewPreferenceContext } from "#src/viewPreference/adminListViewPreferenceContext.ts"
import { Sidebar } from "#ui/interactive/sidebar/Sidebar.jsx"
import { SidebarToggle } from "#ui/interactive/sidebar/SidebarToggle.jsx"
import { AdminMobileNav } from "./AdminMobileNav.tsx"
import { AdminSidebarContent } from "./AdminSidebarContent.tsx"
import { adminShellStateCreate } from "./adminShellStateCreate.ts"
import { adminSidebarContext } from "./adminSidebarContext.ts"

export function AdminShell(props: { readonly children: JSX.Element; readonly area?: "admin" | "organizer" }) {
  const state = adminShellStateCreate(props.area)

  return (
    <adminListViewPreferenceContext.Provider value={state.listViewPreference}>
      <adminSidebarContext.Provider
        value={{
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
              <aside class="sticky top-0 self-start flex h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-surface-muted/50 p-4 max-md:hidden dark:bg-slate-900/50">
                <AdminSidebarContent
                  state={state}
                  showListViewControl={props.area !== "organizer" || state.isAdmin()}
                />
              </aside>
            }
            mobileChildren={null}
          />
          <div class="flex min-w-0 flex-1 flex-col">
            <Show when={!state.sidebarState.isMobile.get()}>
              <SidebarToggle
                {...state.sidebarState}
                variant="outline"
                class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-20 min-h-12 min-w-12 rounded-xl border-0 bg-white/80 text-content shadow-sm shadow-slate-900/10 backdrop-blur-xl hover:bg-white/90 dark:bg-slate-900/80 dark:shadow-black/20 dark:hover:bg-slate-800/90 max-md:hidden"
              />
            </Show>
            <div
              class="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
              classList={{ "max-md:hidden": state.profileVisible(), "max-md:pb-0": state.isOrganizerEventDetail() }}
            >
              {props.children}
            </div>
            <div
              class="hidden min-w-0 flex-1 overflow-y-auto bg-surface-muted/50 p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] dark:bg-slate-900/50"
              classList={{ "max-md:flex": state.profileVisible() }}
            >
              <section aria-label="Profil" class="flex min-h-full w-full flex-col">
                <AdminSidebarContent
                  state={state}
                  showListViewControl={props.area !== "organizer" || state.isAdmin()}
                />
              </section>
            </div>
            {!state.isOrganizerEventDetail() && (
              <AdminMobileNav
                area={props.area ?? "admin"}
                profileActive={state.profileVisible()}
                profileToggle={state.profileToggle}
              />
            )}
          </div>
        </div>
      </adminSidebarContext.Provider>
    </adminListViewPreferenceContext.Provider>
  )
}
