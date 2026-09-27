import type { OrganizerEventDetailPageState } from "./OrganizerEventDetailPageState.ts"

export function organizerEventDetailScannerLifecycleStateCreate(inputs: {
  readonly state: () => OrganizerEventDetailPageState
  readonly mobile: () => boolean
  readonly visible: () => boolean
}) {
  let previousVisible = false
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined

  const scannerVisibilitySync = () => {
    const visible = inputs.visible()
    if (visible && !previousVisible && inputs.mobile()) void inputs.state().scannerStart()
    if (previousVisible && !visible) inputs.state().scannerStop()
    previousVisible = visible
  }

  const scannerFeedbackSync = () => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = undefined
    const outcome = inputs.state().scannerOutcome()
    if (!inputs.mobile() || !inputs.visible() || !outcome) return
    feedbackTimer = setTimeout(() => {
      feedbackTimer = undefined
      inputs.state().scannerOutcomeClear()
    }, 3_000)
  }

  const scannerLifecycleCleanup = () => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = undefined
    inputs.state().scannerStop()
  }

  return { scannerVisibilitySync, scannerFeedbackSync, scannerLifecycleCleanup }
}
