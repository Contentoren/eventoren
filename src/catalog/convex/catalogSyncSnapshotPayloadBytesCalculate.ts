export function catalogSyncSnapshotPayloadBytesCalculate(
  catalogVersion: number,
  eventBytes: number,
  eventCount: number,
): number {
  const emptySnapshotBytes = new TextEncoder().encode(JSON.stringify({ catalogVersion, events: [] })).byteLength
  return emptySnapshotBytes + eventBytes + Math.max(0, eventCount - 1)
}
