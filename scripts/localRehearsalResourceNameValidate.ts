import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalResourceNameInputSchema = a.pipe(a.string(), a.minLength(1, "Resource name is required"))

export function localRehearsalResourceNameValidate(input: unknown): Result<{ name: string }> {
  const op = "localRehearsalResourceNameValidate"
  const parsed = a.safeParse(localRehearsalResourceNameInputSchema, input)
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  const name = parsed.output
  if (name !== "eventoren-local-rehearsal" && !name.startsWith("eventoren-local-rehearsal-"))
    return createResultError(op, "Rehearsal resource names must stay in the eventoren-local-rehearsal namespace")
  if (name.includes("/") || name.includes("..") || name !== name.trim() || /\s/.test(name))
    return createResultError(op, "Rehearsal resource name must not carry path or whitespace parts")
  return createResult({ name })
}
