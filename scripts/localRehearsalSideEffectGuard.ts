import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalSideEffectEnvSchema = a.object({
  allowlistedKeys: a.array(a.string()),
})

const localRehearsalBlockedSideEffectKeys = [
  "EVENTOREN_BILLING_BASE_URL",
  "EVENTOREN_BILLING_ORGANIZATION_ID",
  "EVENTOREN_BILLING_API_CREDENTIAL",
  "EVENTOREN_BILLING_STRIPE_MODE",
  "EVENTOREN_PAYMENT_OUTCOME_BEARER_TOKEN",
  "EVENTOREN_PAYMENT_WEBHOOK_SECRET",
  "AUTH_SMTP_HOST",
  "AUTH_SMTP_USER",
  "AUTH_SMTP_PASS",
  "AUTH_RESEND_API_KEY",
  "AUTH_RESEND_FROM",
  "AUTH_MAILJET_APIKEY_PRIVATE",
  "AUTH_MAILJET_APIKEY_PUBLIC",
  "AUTH_EMAIL_PROVIDER",
  "ZITADEL_CLIENT_SECRET",
  "ZITADEL_MANAGEMENT_TOKEN",
  "ZITADEL_DOMAIN",
  "R2_SECRET_ACCESS_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_ACCOUNT_ID",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "STRIPE_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DATABASE_URL",
  "POSTGRES_URL",
  "MYSQL_URL",
  "SENTRY_DSN",
  "CONVEX_DEPLOYMENT",
  "CONVEX_DEPLOY_KEY",
] as const

export function localRehearsalSideEffectGuardCheck(input: {
  allowlistedKeys: ReadonlyArray<string>
}): Result<{ blockedKeys: ReadonlyArray<string> }> {
  const op = "localRehearsalSideEffectGuardCheck"
  const parsed = a.safeParse(localRehearsalSideEffectEnvSchema, {
    allowlistedKeys: [...input.allowlistedKeys],
  })
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  const leaked = localRehearsalBlockedSideEffectKeys.filter((key) => parsed.output.allowlistedKeys.includes(key))
  if (leaked.length > 0)
    return createResultError(op, `Rehearsal runtime must not carry side-effect credentials: ${leaked.join(", ")}`)
  return createResult({ blockedKeys: localRehearsalBlockedSideEffectKeys })
}
