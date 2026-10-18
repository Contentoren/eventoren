import { DashEventCancelDialog } from "./DashEventCancelDialog.tsx"
import { DashEventDuplicateDialog } from "./DashEventDuplicateDialog.tsx"
import { DashEventPublishDialog } from "./DashEventPublishDialog.tsx"
import { DashTemplateSaveDialog } from "./DashTemplateSaveDialog.tsx"
import { dashEventDialogsHostStateCreate } from "./dashEventDialogsHostStateCreate.ts"

export interface DashEventDialogsHostProps {
  eventId: string
  /**
   * Liest die Event-ID aus `?event=<id>` in den Search-Params der aktuellen Route
   * (statt aus dem `eventId`-Prop): für die Events-Liste, die den Host ohne
   * Event-Kontext mountet und Dialoge per Menu einblendet.
   */
  eventIdFromSearch?: boolean
}

/**
 * Host für die vier Event-Dialoge, gesteuert über die Search-Params der aktuellen Route
 * (`veroeffentlichen`, `duplizieren`, `vorlage-speichern`, `absagen` = "1").
 * Schließen entfernt den jeweiligen Param per `navigate({ search, replace: true })`.
 *
 * Verwendung (C1b): im `DashEventLayout` einmalig `<DashEventDialogsHost eventId={…} />` mounten.
 * Mit `eventIdFromSearch` zusätzlich einmalig in der Events-Liste mounten: liest
 * `?event=<id>` + Flag, Schließen entfernt beide Params, Template-Speichern und
 * Absagen bleiben auf der Liste, ein erfolgreicher Duplikats-Entwurf navigiert
 * zu seinen Details. Die Routen validieren die vier Flags bereits als optionale `"1"`-Strings.
 */
export function DashEventDialogsHost(p: DashEventDialogsHostProps) {
  const state = dashEventDialogsHostStateCreate({ eventIdFromSearch: p.eventIdFromSearch })
  const eventId = () => (p.eventIdFromSearch ? state.dialogEventId() : p.eventId)

  return (
    <>
      <DashEventPublishDialog
        open={state.isOpen("veroeffentlichen")}
        onOpenChange={(open) => {
          if (!open) state.close("veroeffentlichen")
        }}
        eventId={eventId()}
      />
      <DashEventDuplicateDialog
        open={state.isOpen("duplizieren")}
        onOpenChange={(open) => {
          if (!open) state.close("duplizieren")
        }}
        eventId={eventId()}
      />
      <DashTemplateSaveDialog
        open={state.isOpen("vorlage-speichern")}
        onOpenChange={(open) => {
          if (!open) state.close("vorlage-speichern")
        }}
        eventId={eventId()}
      />
      <DashEventCancelDialog
        open={state.isOpen("absagen")}
        onOpenChange={(open) => {
          if (!open) state.close("absagen")
        }}
        eventId={eventId()}
      />
    </>
  )
}
