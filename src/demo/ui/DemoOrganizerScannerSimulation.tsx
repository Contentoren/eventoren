import { languageSignal } from "../../app/i18n/languageSignal.ts"
import type { OrganizerEventDetailPageState } from "../../organizer/OrganizerEventDetailPageState.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { demoOrganizerScanScenarios } from "../fixtures/demoOrganizerScanScenarios.ts"
import { demoOrganizerTextGet } from "../model/demoOrganizerTextGet.ts"

export function DemoOrganizerScannerSimulation(props: { readonly state: OrganizerEventDetailPageState }) {
  return (
    <section
      class="rounded-control border border-brand-accent/30 bg-brand-soft p-space-4"
      aria-labelledby="demo-scanner"
    >
      <h3 id="demo-scanner" class="font-semibold text-content">
        {demoOrganizerTextGet(languageSignal.get()).simulationTitle}
      </h3>
      <p class="mt-space-1 text-sm text-content-muted">
        {demoOrganizerTextGet(languageSignal.get()).simulationDescription}
      </p>
      <div class="mt-space-3 flex flex-wrap gap-space-2">
        <Button size="sm" onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.success)}>
          {demoOrganizerTextGet(languageSignal.get()).success}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.duplicate)}
        >
          {demoOrganizerTextGet(languageSignal.get()).duplicate}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.wrongEvent)}
        >
          {demoOrganizerTextGet(languageSignal.get()).wrongEvent}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.unknown)}
        >
          {demoOrganizerTextGet(languageSignal.get()).unknown}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.unpaid)}
        >
          {demoOrganizerTextGet(languageSignal.get()).unpaid}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.cancelled)}
        >
          {demoOrganizerTextGet(languageSignal.get()).cancelled}
        </Button>
        <Button size="sm" variant="outline" onClick={props.state.scannerPermissionDeniedSimulate}>
          {demoOrganizerTextGet(languageSignal.get()).cameraDenied}
        </Button>
      </div>
      <p class="mt-space-3 text-xs text-content-muted">{demoOrganizerTextGet(languageSignal.get()).resetHint}</p>
      <p class="mt-space-1 text-xs text-content-muted">{demoOrganizerTextGet(languageSignal.get()).realCameraHint}</p>
    </section>
  )
}
