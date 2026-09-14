import { isDevEnv } from "#src/utils/env/isDevEnv.ts"

export function enableGithub() {
  // return false
  return isDevEnv()
}
