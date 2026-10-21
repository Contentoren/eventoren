import { ErrorPage } from "#ui/static/pages/ErrorPage.jsx"
import type { VeranstalterDashboardShellState } from "./veranstalterDashboardShellStateCreate.ts"

/** Error view for the Veranstalter dashboard shell. */
export function VeranstalterDashboardErrorState(p: { readonly state: VeranstalterDashboardShellState }) {
  return (
    <ErrorPage
      title="Veranstalter-Dashboard konnte nicht geladen werden"
      subtitle={p.state.errorMessage() || "Bitte versuche es später erneut."}
    />
  )
}
