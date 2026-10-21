import type { IdUser } from "#src/auth/convex/IdUser.ts"
import type { DecodedToken } from "#src/auth/model/DecodedToken.ts"

export type ResolvedCredential =
  | { kind: "jwt"; userId: IdUser; decodedToken: DecodedToken }
  | { kind: "apiKey"; userId: IdUser; expiresAt?: string }
