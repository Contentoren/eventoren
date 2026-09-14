import type { Doc, Id } from "#convex/_generated/dataModel.js"

export type IdUser = Id<"users">
export type IdAuthAccount = Id<"authAccounts">
export type IdAuthSession = Id<"authSessions">
export type IdAuthRateLimit = Id<"authRateLimits">
export type IdAuthUserEmailRegistration = Id<"authUserEmailRegistrations">
export type IdAuthEmailLoginCode = Id<"authEmailLoginCodes">
export type IdAuthOtp = Id<"authOtps">

export type DocUser = Doc<"users">
export type DocAuthAccount = Doc<"authAccounts">
export type DocAuthSession = Doc<"authSessions">
export type DocAuthRateLimits = Doc<"authRateLimits">
export type DocAuthEmailLoginCode = Doc<"authEmailLoginCodes">
export type DocAuthOtp = Doc<"authOtps">
