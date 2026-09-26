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
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-base pb-[env(safe-area-inset-bottom)] shadow-lg md:hidden"
    >
      <div class="mx-auto flex max-w-md items-center justify-around px-space-2 py-space-2">
        <Button
          variant="none"
          class="flex min-h-12 min-w-20 flex-col gap-1 text-content-muted"
          onClick={state.sidebarOpen}
        >
          <Icon path={mdiAccountOutline} class="size-6" />
          <span class="text-xs">Profil</span>
        </Button>
        <Button
          variant="none"
          class={`flex min-h-12 min-w-20 flex-col gap-1 ${props.state.scannerOpen() ? "text-brand-accent" : "text-content-muted"}`}
          aria-current={props.state.scannerOpen() ? "page" : undefined}
          onClick={state.scannerShow}
        >
          <Icon path={mdiQrcodeScan} class="size-6" />
          <span class="text-xs">Scanner</span>
        </Button>
        <Button
          variant="none"
          class={`flex min-h-12 min-w-20 flex-col gap-1 ${props.state.scannerOpen() ? "text-content-muted" : "text-brand-accent"}`}
          aria-current={!props.state.scannerOpen() ? "page" : undefined}
          onClick={state.ticketsShow}
        >
          <Icon path={mdiTicketOutline} class="size-6" />
          <span class="text-xs">Tickets</span>
        </Button>
      </div>
    </nav>
  )
}
