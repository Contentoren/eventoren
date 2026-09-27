import { mdiAccountOutline } from "@adaptive-ds/mdi/mdiAccountOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"
import { organizerEventDetailMobileNavStateCreate } from "./organizerEventDetailMobileNavStateCreate.ts"

export function OrganizerEventDetailMobileNav(props: { readonly state: OrganizerEventDetailPageState }) {
  const state = organizerEventDetailMobileNavStateCreate(() => props.state)

  return (
    <nav
      aria-label="Veranstalter-Schnellnavigation"
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-base pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/90 [.admin-workspace_&]:shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.16)] dark:[.admin-workspace_&]:bg-slate-900/90 dark:[.admin-workspace_&]:shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.35)]"
    >
      <div class="mx-auto flex max-w-md items-center justify-around px-space-2 py-space-2">
        <Button
          variant="none"
          class={`flex min-h-12 min-w-20 flex-col gap-1 ${props.state.mobileView() === "profile" ? "text-brand-accent" : "text-content-muted"}`}
          aria-current={props.state.mobileView() === "profile" ? "page" : undefined}
          onClick={state.profileShow}
        >
          <Icon path={mdiAccountOutline} class="size-6" />
          <span class="text-xs">Profil</span>
        </Button>
        <Button
          variant="none"
          class={`flex min-h-12 min-w-20 flex-col gap-1 ${props.state.mobileView() === "scanner" ? "text-brand-accent" : "text-content-muted"}`}
          aria-current={props.state.mobileView() === "scanner" ? "page" : undefined}
          onClick={state.scannerShow}
        >
          <Icon path={mdiQrcodeScan} class="size-6" />
          <span class="text-xs">Scanner</span>
        </Button>
        <Button
          variant="none"
          class={`flex min-h-12 min-w-20 flex-col gap-1 ${props.state.mobileView() === "tickets" ? "text-brand-accent" : "text-content-muted"}`}
          aria-current={props.state.mobileView() === "tickets" ? "page" : undefined}
          onClick={state.ticketsShow}
        >
          <Icon path={mdiTicketOutline} class="size-6" />
          <span class="text-xs">Tickets</span>
        </Button>
      </div>
    </nav>
  )
}
