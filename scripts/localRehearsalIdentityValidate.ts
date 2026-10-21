import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalIdentitySchema = a.object({
  instanceName: a.pipe(a.string(), a.minLength(1, "Instance name is required")),
  expectedInstanceName: a.pipe(a.string(), a.minLength(1, "Expected instance name is required")),
})

export function localRehearsalIdentityValidate(input: {
  instanceName: string
  expectedInstanceName: string
}): Result<{ instanceName: string }> {
  const op = "localRehearsalIdentityValidate"
  const parsed = a.safeParse(localRehearsalIdentitySchema, input)
  if (!parsed.success) return createResultError(op, "Rehearsal identity inputs must be non-empty strings")
  if (parsed.output.expectedInstanceName !== "eventoren-local-rehearsal")
    return createResultError(op, "Rehearsal identity guard misconfigured for this runtime")
  if (parsed.output.instanceName !== parsed.output.expectedInstanceName)
    return createResultError(op, "Refusing to restore: backend identity does not match the local rehearsal target")
  return createResult({ instanceName: parsed.output.instanceName })
}
