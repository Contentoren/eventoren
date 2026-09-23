import { execFileSync } from "node:child_process"
import { delimiter, sep } from "node:path"
import { createResult, createResultError } from "#result"

type CredentialCommandRun = (args: string[]) => string

// Bun/Rstest prepend the project's node_modules/.bin, which can contain a different CLI build.
const e2eCredentialCommandRun: CredentialCommandRun = (args) =>
  execFileSync("zitadel-cli", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    env: {
      ...process.env,
      PATH: process.env.PATH?.split(delimiter)
        .filter((directory) => !directory.endsWith(`${sep}node_modules${sep}.bin`))
        .join(delimiter),
    },
  })

export const e2eAuthCredentialsGet = (
  environment: Record<string, string | undefined>,
  credentialCommandRun: CredentialCommandRun = e2eCredentialCommandRun,
) => {
  const op = "e2eAuthCredentialsGet"
  const username = environment.E2E_AUTH_USERNAME?.trim()
  const password = environment.E2E_AUTH_PASSWORD

  if (username && password) return createResult({ username, password })
  if (username || password) {
    return createResultError(
      op,
      "Set both E2E_AUTH_USERNAME and E2E_AUTH_PASSWORD, or set neither to use local Zitadel credentials",
    )
  }

  try {
    const credentialArgs = ["credentials", "get", "testadmin", "--profile", "contentoren", "--field"]
    const resolvedUsername = credentialCommandRun([...credentialArgs, "username"]).trim()
    const resolvedPassword = credentialCommandRun([...credentialArgs, "password"]).trim()

    if (!resolvedUsername || !resolvedPassword) {
      return createResultError(op, "Zitadel CLI returned empty testadmin credentials")
    }

    return createResult({ username: resolvedUsername, password: resolvedPassword })
  } catch {
    return createResultError(
      op,
      "Unable to resolve testadmin credentials; set E2E_AUTH_USERNAME and E2E_AUTH_PASSWORD or configure zitadel-cli",
    )
  }
}
