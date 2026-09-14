import { v } from "convex/values"
import * as a from "valibot"

export type OtpPurpose = keyof typeof otpPurpose

export const otpPurpose = {
  signUp: "signUp",
  signIn: "signIn",
  emailChange: "emailChange",
  passwordChange: "passwordChange",
} as const

export const otpPurposeSchema = a.enum(otpPurpose)

export const otpPurposes: Readonly<OtpPurpose[]> = Object.values(otpPurpose)

export const otpPurposeValidator = v.union(
  v.literal(otpPurpose.signUp),
  v.literal(otpPurpose.signIn),
  v.literal(otpPurpose.emailChange),
  v.literal(otpPurpose.passwordChange),
)

function types1(a: typeof otpPurposeValidator.type): OtpPurpose {
  return a
}
