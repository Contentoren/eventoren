import * as a from "valibot"
import type { UserProfile } from "./UserProfile.ts"
import { userProfileSchema } from "./UserProfile.ts"

export type EventorenBrowserSession = {
  readonly token: string
  readonly profile: UserProfile
  readonly expiresAt: number
}

export const eventorenBrowserSessionSchema = a.object({
  token: a.pipe(a.string(), a.minLength(1)),
  profile: userProfileSchema,
  expiresAt: a.pipe(a.number(), a.integer(), a.minValue(1)),
})
