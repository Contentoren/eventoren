import type { VeranstalterDashboardShellView } from "./veranstalterDashboardShellStateCreate.ts"

/**
 * Frame visibility for dashboard pages. Content shows on `ready`, plus on
 * `empty`/`select` when the page explicitly opts out of the org requirement
 * (onboarding). Loading, login, and error always stay blocked so auth and
 * backend failures are never bypassed.
 */
export function veranstalterDashboardPageFrameStateCreate(inputs: {
  readonly view: () => VeranstalterDashboardShellView
  readonly organizationOptional?: () => boolean
}) {
  const contentVisible = (): boolean => {
    const view = inputs.view()
    if (view === "ready") return true
    if (inputs.organizationOptional?.() === true && (view === "empty" || view === "select")) return true
    return false
  }

  const emptyVisible = (): boolean => inputs.organizationOptional?.() !== true && inputs.view() === "empty"
  const selectionVisible = (): boolean => inputs.organizationOptional?.() !== true && inputs.view() === "select"

  return { contentVisible, emptyVisible, selectionVisible }
}
