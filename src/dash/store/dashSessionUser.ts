import type { DashUser } from "../model/dashUserSchema.ts"
import { dashSessionUserIn } from "./dashSessionUserIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashSessionUser(): DashUser | null {
  return dashSessionUserIn(dashStateGet())
}
