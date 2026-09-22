import * as a from "valibot"

/** Schema validating the persisted automatic sign-in attempt counter. */
export const eventorenSsoAttemptsSchema = a.pipe(a.number(), a.integer(), a.minValue(0))
export type EventorenSsoAttempts = a.InferOutput<typeof eventorenSsoAttemptsSchema>
