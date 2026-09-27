import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"

export function organizerEventDetailMobileNavStateCreate(state: () => OrganizerEventDetailPageState) {
  return {
    profileShow: () => state().mobileViewSelect("profile"),
    scannerShow: () => state().mobileViewSelect("scanner"),
    ticketsShow: () => state().mobileViewSelect("tickets"),
  }
}
