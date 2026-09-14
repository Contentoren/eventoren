import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"

export function createUserIdValidator<T>(o: T) {
  return v.object({ ...o, userId: vIdUser })
}
