export function adminEventOverviewPanelStateCreate() {
  return {
    stopInteraction: (event: Event) => event.stopPropagation(),
  }
}
