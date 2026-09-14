import { isProdEnv } from "#src/utils/env/isProdEnv.ts"

export function enablePosthog() {
  // return true
  // return false
  return isProdEnv()
}
