import { v } from "convex/values"
import { fieldsConvexCreatedAtUpdatedAt } from "#src/utils/data/fieldsConvexCreatedAtUpdatedAt.ts"

export const fieldsConvexCreatedAtUpdatedAtDeletedAt = {
  ...fieldsConvexCreatedAtUpdatedAt,
  deletedAt: v.optional(v.string()),
} as const
