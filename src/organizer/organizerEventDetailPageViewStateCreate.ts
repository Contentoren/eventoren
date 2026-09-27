import { createEffect, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"
import { organizerEventDetailScannerLifecycleStateCreate } from "./organizerEventDetailScannerLifecycleStateCreate.ts"

export function organizerEventDetailPageViewStateCreate(inputs: {
  readonly state: () => OrganizerEventDetailPageState
  readonly mobileNavigation: () => boolean | undefined
}) {
  const belowMd = createSignalObject(false)
  const mobile = () => Boolean(inputs.mobileNavigation() && belowMd.get())
  const ticketsVisible = () => !mobile() || inputs.state().mobileView() === "tickets"
  const scannerVisible = () => (mobile() ? inputs.state().mobileView() === "scanner" : inputs.state().scannerOpen())
  const scannerLifecycle = organizerEventDetailScannerLifecycleStateCreate({
    state: inputs.state,
    mobile,
    visible: scannerVisible,
  })
  onCleanup(scannerLifecycle.scannerLifecycleCleanup)

  onMount(() => {
    const media = window.matchMedia("(width < 48rem)")
    const update = () => belowMd.set(media.matches)
    update()
    media.addEventListener("change", update)
    onCleanup(() => media.removeEventListener("change", update))
  })

  createEffect(() => {
    scannerLifecycle.scannerVisibilitySync()
  })

  createEffect(() => {
    inputs.state().scannerOutcome()
    mobile()
    scannerVisible()
    scannerLifecycle.scannerFeedbackSync()
  })

  return {
    ...inputs.state(),
    scannerErrorMessage: () => inputs.state().scannerErrorMessage(mobile()),
    mobile,
    ticketsVisible,
    scannerVisible,
    profileVisible: () => mobile() && inputs.state().mobileView() === "profile",
  }
}
