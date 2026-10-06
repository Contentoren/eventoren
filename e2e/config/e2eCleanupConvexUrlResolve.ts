import { readFileSync } from "node:fs"
import { parse } from "dotenv"

/** Resolve the native lifecycle client's backend without importing target secrets into process.env. */
export const e2eCleanupConvexUrlResolve = (
  environment: Record<string, string | undefined>,
  target: "production" | "development",
  targetEnvironmentFilePath = `.env.${target}`,
): string | undefined => {
  const override = environment.E2E_CLEANUP_CONVEX_URL?.trim()
  if (override) return override

  let targetEnvironment: Record<string, string> = {}
  try {
    targetEnvironment = parse(readFileSync(targetEnvironmentFilePath))
  } catch {
    return undefined
  }

  return targetEnvironment.VITE_CONVEX_URL?.trim() || targetEnvironment.PUBLIC_BASE_URL_CONVEX?.trim() || undefined
}
