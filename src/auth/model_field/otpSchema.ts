import * as a from "valibot"

export const otpSchema = a.pipe(
  a.string(),
  a.minLength(6, "Code must be exactly 6 digits"),
  a.maxLength(6, "Code must be exactly 6 digits"),
  a.regex(/^\d{6}$/, "Code must contain only numbers"),
)
