import { isDevEnv } from "#ui/env/isDevEnv.ts"

export function hasDevMode(): boolean {
  return isDevEnv()
}
