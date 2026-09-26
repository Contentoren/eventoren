import * as v from "valibot"

/** Only nonsecret target and progress metadata; no mail links, codes, sessions or credentials. */
export const e2eCheckpointSchema = v.strictObject({
  version: v.literal(1),
  target: v.picklist(["production", "development"]),
  baseUrl: v.picklist(["https://eventoren.de", "https://eventoren.leonardomora.de"]),
  runId: v.pipe(v.string(), v.regex(/^[0-9a-z]+-[0-9a-f-]{36}$/u)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  phase: v.picklist(["sso", "ticket-unreconciled"]),
})

export type E2eCheckpoint = v.InferOutput<typeof e2eCheckpointSchema>
