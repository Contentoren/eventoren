import type { Language } from "#src/app/i18n/language.ts"

type AuthEmailKind = "emailChange" | "orgInvitation" | "passwordChange"

type AuthEmailContentInput = {
  kind: AuthEmailKind
  code: string
  language: Language
  name?: string
  url: string
  expiryMinutes?: number
  supportUrl?: string
  invitedByName?: string
  invitedByEmail?: string
  orgName?: string
}

type AuthEmailContent = { subject: string; html: string; text: string }

export function authEmailContentCreate(input: AuthEmailContentInput): AuthEmailContent {
  const copy = authEmailCopy(input)
  const name = input.name?.trim() || copy.defaultName
  const greeting = copy.greeting.replace("{{name}}", name)
  const code = input.code.trim()
  const message = copy.message
    .replace("{{invitedByName}}", input.invitedByName ?? "")
    .replace("{{invitedByEmail}}", input.invitedByEmail ?? "")
    .replace("{{orgName}}", input.orgName ?? "")
  const url = safeHref(input.url)
  const link = `<a href="${escapeHtml(url)}" style="background:#1f2937;color:#ffffff;display:inline-block;padding:12px 18px;border-radius:6px;text-decoration:none">${escapeHtml(copy.button)}</a>`
  const expiry =
    input.expiryMinutes === undefined ? "" : copy.expiry.replace("{{minutes}}", String(input.expiryMinutes))
  const support = input.supportUrl ? `${copy.support} ${input.supportUrl}` : ""
  const invitation =
    input.kind === "orgInvitation"
      ? copy.invitation
          .replace("{{invitedByName}}", input.invitedByName ?? "")
          .replace("{{invitedByEmail}}", input.invitedByEmail ?? "")
          .replace("{{orgName}}", input.orgName ?? "")
      : ""
  const text = [copy.title, greeting, message, invitation, code ? `Code: ${code}` : "", url, expiry, support]
    .filter(Boolean)
    .join("\n\n")
  const html = `<div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,sans-serif;color:#111827"><div style="margin:auto;max-width:560px;background:#ffffff;border-radius:10px;padding:32px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280">Eventoren</p><h1 style="font-size:24px">${escapeHtml(copy.title)}</h1><p>${escapeHtml(greeting)}</p><p>${escapeHtml(message)}</p>${invitation ? `<p>${escapeHtml(invitation)}</p>` : ""}${code ? `<p style="font-size:28px;font-weight:700;letter-spacing:.16em">${escapeHtml(code)}</p>` : ""}<p>${link}</p>${expiry ? `<p style="color:#6b7280">${escapeHtml(expiry)}</p>` : ""}${support ? `<p style="color:#6b7280">${escapeHtml(support)}</p>` : ""}<p style="margin-top:32px;color:#6b7280;font-size:12px">Eventoren</p></div></div>`
  return { subject: copy.subject, html, text }
}

function authEmailCopy(input: AuthEmailContentInput) {
  const isEnglish = input.language === "en"
  const isRussian = input.language === "ru"
  const isTajik = input.language === "tj"
  if (input.kind === "passwordChange") {
    return isEnglish
      ? copy(
          "Change your Eventoren password",
          "Password change requested",
          "Use this code or button to change your password.",
          "Change password",
          "Hello {{name}},",
          "This code is valid for {{minutes}} minutes.",
          "For help, contact",
          "Eventoren",
          "",
        )
      : isRussian
        ? copy(
            "Изменение пароля Eventoren",
            "Запрошено изменение пароля",
            "Используйте этот код или кнопку, чтобы изменить пароль.",
            "Изменить пароль",
            "Здравствуйте, {{name}}!",
            "Код действителен {{minutes}} минут.",
            "По вопросам обращайтесь:",
            "Eventoren",
            "",
          )
        : isTajik
          ? copy(
              "Тағйири пароли Eventoren",
              "Тағйири парол дархост шуд",
              "Барои тағйири парол ин рамз ё тугмаро истифода баред.",
              "Тағйири парол",
              "Салом, {{name}}!",
              "Рамз {{minutes}} дақиқа эътибор дорад.",
              "Барои кӯмак муроҷиат кунед:",
              "Eventoren",
              "",
            )
          : copy(
              "Eventoren-Passwort ändern",
              "Passwortänderung angefordert",
              "Verwenden Sie diesen Code oder die Schaltfläche, um Ihr Passwort zu ändern.",
              "Passwort ändern",
              "Hallo {{name}},",
              "Der Code ist {{minutes}} Minuten gültig.",
              "Bei Fragen wenden Sie sich an",
              "Eventoren",
              "",
            )
  }
  if (input.kind === "emailChange") {
    return isEnglish
      ? copy(
          "Confirm your new Eventoren email",
          "Confirm your new email address",
          "Use this code or button to confirm your new email address.",
          "Confirm email",
          "Hello {{name}},",
          "This code is valid for {{minutes}} minutes.",
          "For help, contact",
          "Eventoren",
          "",
        )
      : isRussian
        ? copy(
            "Подтвердите новый адрес Eventoren",
            "Подтвердите новый адрес электронной почты",
            "Используйте этот код или кнопку, чтобы подтвердить новый адрес.",
            "Подтвердить почту",
            "Здравствуйте, {{name}}!",
            "Код действителен {{minutes}} минут.",
            "По вопросам обращайтесь:",
            "Eventoren",
            "",
          )
        : isTajik
          ? copy(
              "Почтаи нави Eventoren-ро тасдиқ кунед",
              "Почтаи нави худро тасдиқ кунед",
              "Барои тасдиқи почтаи нав ин рамз ё тугмаро истифода баред.",
              "Тасдиқи почта",
              "Салом, {{name}}!",
              "Рамз {{minutes}} дақиқа эътибор дорад.",
              "Барои кӯмак муроҷиат кунед:",
              "Eventoren",
              "",
            )
          : copy(
              "Neue Eventoren-E-Mail bestätigen",
              "Neue E-Mail-Adresse bestätigen",
              "Verwenden Sie diesen Code oder die Schaltfläche, um Ihre neue E-Mail-Adresse zu bestätigen.",
              "E-Mail bestätigen",
              "Hallo {{name}},",
              "Der Code ist {{minutes}} Minuten gültig.",
              "Bei Fragen wenden Sie sich an",
              "Eventoren",
              "",
            )
  }
  return isEnglish
    ? copy(
        "Eventoren invitation",
        "You are invited to Eventoren",
        "{{invitedByName}} ({{invitedByEmail}}) invited you to join {{orgName}}.",
        "Accept invitation",
        "Hello {{name}},",
        "This invitation contains a secure link.",
        "For help, contact",
        "Eventoren",
        "Use the button to accept this invitation.",
      )
    : copy(
        "Eventoren-Einladung",
        "Sie wurden zu Eventoren eingeladen",
        "{{invitedByName}} ({{invitedByEmail}}) hat Sie eingeladen, {{orgName}} beizutreten.",
        "Einladung annehmen",
        "Hallo {{name}},",
        "Diese Einladung enthält einen sicheren Link.",
        "Bei Fragen wenden Sie sich an",
        "Eventoren",
        "Verwenden Sie die Schaltfläche, um die Einladung anzunehmen.",
      )
}

function copy(
  subject: string,
  title: string,
  message: string,
  button: string,
  greeting: string,
  expiry: string,
  support: string,
  defaultName: string,
  invitation: string,
) {
  return { subject, title, message, button, greeting, expiry, support, defaultName, invitation }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function safeHref(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? value : "#"
  } catch {
    return "#"
  }
}
