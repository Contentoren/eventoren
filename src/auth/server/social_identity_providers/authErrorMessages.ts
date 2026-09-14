import { stringifyValibotErrors } from "#utils/valibot/stringifyValibotErrors.js"

export const authErrorMessages = {
  // token
  tokenFailedToFetchStatus: (provider: string, status: number, data: string) =>
    `failed to fetch ${provider} auth token, status: ${status}, data: ${data}`,
  tokenFailedToParse: (provider: string, e: any, data: string) =>
    `failed to parse ${provider} auth token schema: ${stringifyValibotErrors(e)}, data: ${data}`,
  // profile
  profileFailedToFetchStatus: (provider: string, status: number, data: string) =>
    `failed to fetch ${provider} auth profile, status: ${status}, data: ${data}`,
  profileFailedToParse: (provider: string, e: any, data: string) =>
    `failed to parse ${provider} auth profile schema: ${stringifyValibotErrors(e)}, data: ${data}`,
} as const
