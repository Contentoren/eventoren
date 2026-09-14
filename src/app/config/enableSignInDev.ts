import { isDevEnv } from "#src/utils/env/isDevEnv.ts"

export function enableSignInDev() {
  return false
  return isDevEnv()
  return false && isDevEnv()
}
