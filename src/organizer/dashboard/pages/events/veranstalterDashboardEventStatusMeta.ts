import { mdiArchiveOutline } from "@adaptive-ds/mdi/mdiArchiveOutline.js"
import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import type { OrganizerDashboardEventStatus } from "../../events/model/organizerDashboardEventStatusSchema.ts"

export type VeranstalterDashboardEventStatusMeta = {
  readonly label: string
  readonly icon: string
}

const veranstalterDashboardEventStatusMetaByStatus: Record<
  OrganizerDashboardEventStatus,
  VeranstalterDashboardEventStatusMeta
> = {
  draft: { label: "Entwurf", icon: mdiPencilOutline },
  published: { label: "Veröffentlicht", icon: mdiCheckCircleOutline },
  archived: { label: "Archiviert", icon: mdiArchiveOutline },
}

/** German status label plus icon path; unknown values fall back to a neutral ticket label. */
export function veranstalterDashboardEventStatusMeta(status: string): VeranstalterDashboardEventStatusMeta {
  return (
    veranstalterDashboardEventStatusMetaByStatus[status as OrganizerDashboardEventStatus] ?? {
      label: status,
      icon: mdiTicketOutline,
    }
  )
}
