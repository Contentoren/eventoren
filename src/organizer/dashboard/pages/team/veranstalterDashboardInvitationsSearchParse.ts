import * as v from "valibot"

const organizerDashboardInvitationsSearchSchema = v.object({
  einladung: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
})

/**
 * URL state of the invitation inbox: the invitation id of the mail link.
 * The id is only a hint for the view; the backend checks the account e-mail
 * of the signed-in user before anything is granted.
 */
export function organizerDashboardInvitationsSearchParse(value: unknown): { readonly einladung: string | undefined } {
  const result = v.safeParse(organizerDashboardInvitationsSearchSchema, value)
  if (!result.success) return { einladung: undefined }
  return { einladung: result.output.einladung }
}
