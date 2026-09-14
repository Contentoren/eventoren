import { pageRouteAuth } from "#src/auth/url/pageRouteAuth.ts"
import { serializeUrlParams } from "#utils/url/serializeUrlParams.js"

export function urlSignUpConfirmEmail(email: string, code: string, returnPath?: string) {
  const obj: Record<string, string> = { email, code }
  if (returnPath) {
    obj.returnPath = returnPath
  }
  return `${pageRouteAuth.signUpConfirmEmail}?${serializeUrlParams(obj)}`
}
