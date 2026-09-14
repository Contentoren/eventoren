import type { PromiseResult } from "#result"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"
import { sendTelegramMessageHtml, type TelegramEnvVariableNames } from "#utils/telegram/sendTelegramMessageHtml.js"

export async function sendTelegramMessageAuth(
  name: string,
  data: any,
  disableNotification: boolean = true,
): PromiseResult<null> {
  return sendTelegramMessageTechnical(name, data, privateEnvVariableName.TELEGRAM_CHAT_ID_AUTH, disableNotification)
}

export async function sendTelegramMessageError(
  name: string,
  data: any,
  disableNotification: boolean = true,
): PromiseResult<null> {
  return sendTelegramMessageTechnical(name, data, privateEnvVariableName.TELEGRAM_CHAT_ID_ERRORS, disableNotification)
}

export async function sendTelegramMessageTechnical(
  name: string,
  data: any,
  chatIdVariableName: string,
  disableNotification: boolean = true,
): PromiseResult<null> {
  const startedAt = Date.now()
  const telegramEnvVariables = {
    apiToken: privateEnvVariableName.TELEGRAM_TOKEN,
    chatId: chatIdVariableName,
  } as const satisfies TelegramEnvVariableNames
  const content = telegramCreateJsonHtmlMessage(name, data)
  const got = await sendTelegramMessageHtml(content, telegramEnvVariables, disableNotification)
  const endedAt = Date.now()
  const durationMs = endedAt - startedAt
  const op = "sendTelegramMessageTechnical"
  console.log(op, "telegram api call:", got, durationMs, "ms")
  return got
}

function telegramCreateJsonHtmlMessage(title: string, data: any): string {
  let text = `<b>${title}</b>`.trim()
  if (!data) return text
  const serialized = typeof data === "string" ? data : JSON.stringify(data, null, 2)
  text += "\n" + `<pre><code class="json">${serialized}</code></pre>`
  return text
}
