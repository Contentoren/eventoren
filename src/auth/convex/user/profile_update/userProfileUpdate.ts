import { v } from "convex/values"
import * as a from "valibot"

export const userProfileUpdateSchema = a.object({
  token: a.string(),
  name: a.optional(a.string()),
  image: a.optional(a.string()),
  bio: a.optional(a.string()),
  url: a.optional(a.string()),
})

export const userProfileUpdateFields = {
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  bio: v.optional(v.string()),
  url: v.optional(v.string()),
} as const
