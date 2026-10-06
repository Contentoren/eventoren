export function nativeAuthLifecycleEventFind<T extends { readonly id: string }>(
  events: readonly T[],
  eventKey: string,
): T | undefined {
  // The authorized admin projection exposes catalog eventKey as EventItem.id.
  return events.find((event) => event.id === eventKey)
}
