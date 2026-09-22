"use node"

import nodemailer from "nodemailer"
import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"

type AuthEmailSendInput = {
  toEmail: string
  toName?: string
  subject: string
  html: string
  text: string
}

export async function authEmailSend(input: AuthEmailSendInput): PromiseResult<null> {
  const op = "authEmailSend"
  const recipientResult = a.safeParse(emailSchema, input.toEmail)
  if (!recipientResult.success) return createResultError(op, "Auth email recipient is invalid")
  if (input.toName && input.toName.length > 100) return createResultError(op, "Auth email recipient name is too long")

  const host = environmentValue("AUTH_SMTP_HOST")
  const port = Number(environmentValue("AUTH_SMTP_PORT") ?? "587")
  const secureValue = environmentValue("AUTH_SMTP_SECURE")
  const tlsServername = environmentValue("AUTH_SMTP_TLS_SERVERNAME")
  const username = environmentValue("AUTH_SMTP_USER")
  const password = environmentValue("AUTH_SMTP_PASS")
  if (!host || !username || !password) return createResultError(op, "Auth SMTP is not configured")
  if (!Number.isInteger(port) || port < 1 || port > 65535) return createResultError(op, "Auth SMTP port is invalid")
  if (secureValue && !["false", "starttls", "true", "ssl"].includes(secureValue.toLowerCase()))
    return createResultError(op, "Auth SMTP security mode is invalid")

  const secure = secureValue ? ["true", "ssl"].includes(secureValue.toLowerCase()) : port === 465

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      tls: {
        rejectUnauthorized: true,
        ...(tlsServername ? { servername: tlsServername } : {}),
      },
      auth: { user: username, pass: password },
    })
    await transport.sendMail({
      from: { name: "Eventoren", address: "it@contentoren.de" },
      to: input.toName ? { name: input.toName, address: input.toEmail } : input.toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    return createResult(null)
  } catch (error) {
    console.error(op, {
      code: smtpErrorValue(error, "code"),
      responseCode: smtpErrorValue(error, "responseCode"),
      command: smtpErrorValue(error, "command"),
      response: smtpErrorValue(error, "response"),
    })
    return createResultError(op, "Could not send email through SMTP")
  }
}

function environmentValue(key: string): string | undefined {
  const value = process.env[key]
  return value?.trim() || undefined
}

function smtpErrorValue(error: unknown, key: string): string | number | undefined {
  if (!error || typeof error !== "object") return undefined
  const value = (error as Record<string, unknown>)[key]
  if (typeof value === "string" || typeof value === "number") return value
  return undefined
}
