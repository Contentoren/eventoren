import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"

/** Empty view shown when the user belongs to no Veranstalter organisation. */
export function VeranstalterDashboardEmptyState() {
  return (
    <CardWrapper class="rounded-card border-border-subtle shadow-none">
      <EmptyState
        icon={mdiDomain}
        title="Noch keine Organisation"
        description="Sobald du einer Veranstalter-Organisation angehörst, erscheint sie hier. Oder gründe eine neue Organisation."
        actions={
          <>
            <LinkButtonInternal to="/veranstalter-einladungen" variant={buttonVariant.contrast}>
              Meine Einladungen
            </LinkButtonInternal>
            <LinkButtonInternal to="/veranstalter/onboarding" variant={buttonVariant.outline}>
              Organisation erstellen
            </LinkButtonInternal>
          </>
        }
      />
    </CardWrapper>
  )
}
