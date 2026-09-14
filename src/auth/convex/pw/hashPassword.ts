import { createError, createResult, type PromiseResult } from "#result"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"

export async function hashPassword2(password: string): PromiseResult<string> {
  const op = "hashPassword2"
  const saltResult = envAuthSecretResult()
  if (!saltResult.success) return saltResult
  const salt = saltResult.data
  if (!salt) return createError(op, "env.AUTH_SECRET not defined")
  return createResult(await hashPassword(password, salt))
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const saltBuffer = encoder.encode(salt)

  const key = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveBits"])

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    key,
    256,
  )

  const hashArray = Array.from(new Uint8Array(derivedBits))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  return hash
}
