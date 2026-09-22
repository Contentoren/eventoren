"use node"

import { v } from "convex/values"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { languageValidator } from "#src/app/i18n/language.ts"
import { urlSupportMail } from "#src/app/url/urlSupport.ts"
import { authEmailContentCreate } from "#src/auth/convex/email/authEmailContentCreate.ts"
import { authEmailSend } from "#src/auth/convex/email/authEmailSend.ts"

const authEmailKindValidator = v.union(
  v.literal("emailChange"),
  v.literal("orgInvitation"),
  v.literal("passwordChange"),
  v.literal("signIn"),
  v.literal("signUp"),
)

const sendAuthEmailValidator = v.object({
  kind: authEmailKindValidator,
  toEmail: v.string(),
  toName: v.optional(v.string()),
  code: v.string(),
  url: v.string(),
  language: languageValidator,
  invitedByName: v.optional(v.string()),
  invitedByEmail: v.optional(v.string()),
  orgName: v.optional(v.string()),
})

type SendAuthEmailArgs = typeof sendAuthEmailValidator.type

export const sendAuthEmailInternalAction = internalAction({
  args: sendAuthEmailValidator,
  handler: sendAuthEmailInternalActionFn,
})

async function sendAuthEmailInternalActionFn(_ctx: ActionCtx, args: SendAuthEmailArgs): PromiseResult<null> {
  const content = authEmailContentCreate({
    kind: args.kind,
    code: args.code,
    language: args.language,
    name: args.toName,
    url: args.url,
    ...(args.kind === "passwordChange" ? { expiryMinutes: 20, supportUrl: urlSupportMail } : {}),
    ...(args.kind === "emailChange" ? { expiryMinutes: 10, supportUrl: urlSupportMail } : {}),
    invitedByName: args.invitedByName,
    invitedByEmail: args.invitedByEmail,
    orgName: args.orgName,
  })
  const result = await authEmailSend({
    toEmail: args.toEmail,
    toName: args.toName,
    ...content,
  })
  if (!result.success) return result
  return createResult(null)
}
