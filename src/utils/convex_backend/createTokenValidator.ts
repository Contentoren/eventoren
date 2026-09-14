import { v } from "convex/values"

export function createTokenValidator<T>(o: T) {
  return v.object({ ...o, token: v.string() })
}
