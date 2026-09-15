// Billing accepts one complete catalog revision atomically (up to 10,000 events).
// Keep the request body below a conservative local 16 MiB boundary so retries
// never need to assemble an unbounded action payload.
const catalogSyncLimits = {
  billingMaxEvents: 10_000,
  billingMaxTiersPerEvent: 1_000,
  buildEventsPerBatch: 10,
  snapshotChunkMaxBytes: 768 * 1024,
  snapshotQueryPageSize: 25,
  billingPayloadMaxBytes: 16 * 1024 * 1024,
  billingEnvelopeReserveBytes: 256,
} as const

export { catalogSyncLimits }
