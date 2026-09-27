import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import type { JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

export function AdminMobileNav(props: {
  readonly profileActive: boolean
  readonly profileToggle: () => void
  readonly area?: "admin" | "organizer"
  readonly children?: JSX.Element
}) {
  return (
    <nav
      aria-label={props.area === "admin" ? "Admin-Schnellnavigation" : "Veranstalter-Schnellnavigation"}
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-base pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/90 [.admin-workspace_&]:shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.16)] dark:[.admin-workspace_&]:bg-slate-900/90 dark:[.admin-workspace_&]:shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.35)]"
    >
      <div class="mx-auto grid h-[4.5rem] max-w-md grid-cols-3 items-center px-space-2">
        <Button
          variant="none"
          class={`min-h-12 min-w-20 flex-col gap-1 justify-self-center ${props.profileActive ? "text-brand-accent" : "text-content-muted"}`}
          aria-current={props.profileActive ? "page" : undefined}
          aria-label="Profil"
          onClick={props.profileToggle}
        >
          <Icon path={mdiAccountOutline} class="size-6" />
          <span class="text-xs">Profil</span>
        </Button>
        {props.children}
      </div>
    </nav>
  )
}
