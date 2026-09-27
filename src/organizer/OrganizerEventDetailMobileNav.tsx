import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { AdminMobileNav } from "#src/admin/AdminMobileNav.tsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"
import { organizerEventDetailMobileNavStateCreate } from "./organizerEventDetailMobileNavStateCreate.ts"

export function OrganizerEventDetailMobileNav(props: { readonly state: OrganizerEventDetailPageState }) {
  const state = organizerEventDetailMobileNavStateCreate(() => props.state)

  return (
    <AdminMobileNav profileActive={props.state.mobileView() === "profile"} profileToggle={state.profileShow}>
      <Button
        variant="none"
        class={`min-h-12 min-w-20 flex-col gap-1 justify-self-center ${props.state.mobileView() === "scanner" ? "text-brand-accent" : "text-content-muted"}`}
        aria-current={props.state.mobileView() === "scanner" ? "page" : undefined}
        onClick={state.scannerShow}
      >
        <Icon path={mdiQrcodeScan} class="size-6" />
        <span class="text-xs">Scanner</span>
      </Button>
      <Button
        variant="none"
        class={`min-h-12 min-w-20 flex-col gap-1 justify-self-center ${props.state.mobileView() === "tickets" ? "text-brand-accent" : "text-content-muted"}`}
        aria-current={props.state.mobileView() === "tickets" ? "page" : undefined}
        onClick={state.ticketsShow}
      >
        <Icon path={mdiTicketOutline} class="size-6" />
        <span class="text-xs">Tickets</span>
      </Button>
    </AdminMobileNav>
  )
}
