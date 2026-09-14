import * as a from "valibot"

export const signUpTermsSchema = a.pipe(
  a.boolean(),
  a.check((input) => input === true, "You must agree to the Terms of Service and Privacy Policy"),
)
