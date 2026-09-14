import * as a from "valibot"
import { type UserProfile, userProfileSchema } from "#src/auth/model/UserProfile.ts"

export type UserProfileDictionary = Record<string, UserProfile>

export const userProfileDistionarySchema = a.record(a.string(), userProfileSchema)
