import * as v from "valibot"

/**
 * File-local durable state for one native-auth lifecycle run. The ordered
 * step cursor (create, edit, verify) is a prefix: resume skips verified steps
 * and continues at the first unfinished one. Only fixture identity and the
 * cursor persist; browser sessions are always rebuilt, and this checkpoint
 * never deletes the draft. Removal belongs to the whole-invocation success
 * barrier only.
 */
export const nativeAuthLifecycleCheckpointSchema = v.strictObject({
  version: v.literal(1),
  target: v.picklist(["production", "development"]),
  baseUrl: v.picklist(["https://eventoren.de", "https://eventoren.leonardomora.de"]),
  runId: v.pipe(v.string(), v.regex(/^[0-9a-z]+-[0-9a-f-]{36}$/u)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  step: v.picklist(["create", "edit", "verify"]),
  status: v.picklist(["started", "completed"]),
  eventKey: v.pipe(v.string(), v.regex(/^native-auth-[0-9a-fA-F-]{36}$/u)),
  titleMarker: v.pipe(v.string(), v.minLength(1)),
  initialTitle: v.pipe(v.string(), v.minLength(1)),
  editedTitle: v.pipe(v.string(), v.minLength(1)),
})

export type NativeAuthLifecycleCheckpoint = v.InferOutput<typeof nativeAuthLifecycleCheckpointSchema>
