import { mdiAlertBoxOutline } from "@adaptive-ds/mdi/mdiAlertBoxOutline.js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"

/** Login view shown when the visitor is signed out. */
export function VeranstalterDashboardLoginState() {
  return (
    <CardWrapper class="rounded-card border-border-subtle shadow-none">
      <EmptyState
        icon={mdiAlertBoxOutline}
        title="Anmeldung erforderlich"
        description="Melde dich an, um dein Veranstalter-Dashboard zu sehen."
        actions={
          <LinkButtonInternal to="/sign-in" search={{ returnTo: "/veranstalter" }} variant={buttonVariant.contrast}>
            Zur Anmeldung
          </LinkButtonInternal>
        }
      />
    </CardWrapper>
  )
}
