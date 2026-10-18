import type { DashEvent } from "../model/dashEventSchema.ts"
import { dashEventByIdIn } from "./dashEventByIdIn.ts"
import { dashStateGet } from "./dashStateGet.ts"

export function dashEventById(id: string): DashEvent | null {
  return dashEventByIdIn(dashStateGet(), id)
}
