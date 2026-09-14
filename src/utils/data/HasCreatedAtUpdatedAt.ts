import type { HasCreatedAt } from "#src/utils/data/HasCreatedAt.ts"
import type { HasUpdatedAt } from "#src/utils/data/HasUpdatedAt.ts"

export interface HasCreatedAtUpdatedAt extends HasCreatedAt, HasUpdatedAt {}

export function createdAtUpdatedAtCreate(date: string = ""): HasCreatedAtUpdatedAt {
  return { createdAt: date, updatedAt: date }
}
