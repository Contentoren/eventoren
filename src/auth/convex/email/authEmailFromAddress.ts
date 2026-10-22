import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"

export const authEmailDefaultFromAddress = "kontakt@eventoren.de"
export const authEmailPaymentFromAddress = "bestellung@eventoren.de"
export const authEmailAlternativeFromAddress = "info@eventoren.de"

/** Sender for auth mail. Env override via AUTH_SMTP_FROM, default kontakt. */
export function authEmailFromAddressRead(env: Record<string, string | undefined> = process.env): Result<string> {
  const op = "authEmailFromAddressRead"
  const raw = env.AUTH_SMTP_FROM?.trim()
  if (!raw) return createResult(authEmailDefaultFromAddress)
  const parsed = a.safeParse(emailSchema, raw)
  if (!parsed.success) return createResultError(op, "Auth SMTP sender is invalid")
  return createResult(parsed.output)
}
