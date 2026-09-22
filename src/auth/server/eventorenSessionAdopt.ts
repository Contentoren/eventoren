import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { eventorenAuthIdentityCreate } from "#src/auth/model/eventorenAuthIdentityCreate.ts"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"

const eventorenSessionAdoptInputSchema = a.object({
  token: a.pipe(a.string(), a.minLength(1)),
  mode: a.picklist(["legacy", "replace"]),
})

type EventorenSessionAdoptDependencies = {
  readonly currentUserRead: () => PromiseResult<UserProfile | null>
  readonly candidateRead: (token: string) => PromiseResult<UserProfile | null>
  readonly setCookie?: (token: string) => void
}

export async function eventorenSessionAdopt(
  input: unknown,
  dependencies: EventorenSessionAdoptDependencies,
): PromiseResult<EventorenAuthIdentity> {
  const op = "eventorenSessionAdopt"
  const validation = a.safeParse(eventorenSessionAdoptInputSchema, input)
  if (!validation.success) return createResultError(op, a.summarize(validation.issues))

  const currentResult = await dependencies.currentUserRead()
  if (!currentResult.success && validation.output.mode === "legacy") {
    return createResultError(op, currentResult.errorMessage)
  }

  const candidateResult = await dependencies.candidateRead(validation.output.token)
  if (!candidateResult.success) return createResultError(op, candidateResult.errorMessage)
  if (!candidateResult.data) return createResultError(op, "Die Browser-Sitzung ist nicht mehr gültig.")

  if (
    validation.output.mode === "legacy" &&
    currentResult.success &&
    currentResult.data &&
    currentResult.data.userId !== candidateResult.data.userId
  ) {
    return createResult(eventorenAuthIdentityCreate(currentResult.data))
  }

  if (!dependencies.setCookie) return createResultError(op, "Die Sitzung konnte nicht übernommen werden.")
  dependencies.setCookie(validation.output.token)
  return createResult(eventorenAuthIdentityCreate(candidateResult.data))
}
