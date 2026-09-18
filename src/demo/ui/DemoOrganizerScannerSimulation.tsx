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
        {demoOrganizerTextGet().simulationTitle}
      </h3>
      <p class="mt-space-1 text-sm text-content-muted">{demoOrganizerTextGet().simulationDescription}</p>
      <div class="mt-space-3 flex flex-wrap gap-space-2">
        <Button size="sm" onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.success)}>
          {demoOrganizerTextGet().success}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.duplicate)}
        >
          {demoOrganizerTextGet().duplicate}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.wrongEvent)}
        >
          {demoOrganizerTextGet().wrongEvent}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.unknown)}
        >
          {demoOrganizerTextGet().unknown}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.unpaid)}
        >
          {demoOrganizerTextGet().unpaid}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void props.state.scannerCodeSimulate(demoOrganizerScanScenarios.cancelled)}
        >
          {demoOrganizerTextGet().cancelled}
        </Button>
        <Button size="sm" variant="outline" onClick={props.state.scannerPermissionDeniedSimulate}>
          {demoOrganizerTextGet().cameraDenied}
        </Button>
      </div>
      <p class="mt-space-3 text-xs text-content-muted">{demoOrganizerTextGet().resetHint}</p>
      <p class="mt-space-1 text-xs text-content-muted">{demoOrganizerTextGet().realCameraHint}</p>
    </section>
  )
}
