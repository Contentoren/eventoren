import * as a from "valibot"

/** Schema validating the browser-local preference for automatic sign-in. */
export const eventorenSsoPreferenceSchema = a.boolean()
export type EventorenSsoPreference = a.InferOutput<typeof eventorenSsoPreferenceSchema>
