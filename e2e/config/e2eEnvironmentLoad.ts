import { existsSync } from "node:fs"
import { config as dotenvConfig } from "dotenv"

export const e2eEnvironmentLoad = (envFilePath = process.env.E2E_ENV_FILE ?? ".env.e2e.local"): void => {
  if (!existsSync(envFilePath)) return

  dotenvConfig({ path: envFilePath, override: false, quiet: true })
}
