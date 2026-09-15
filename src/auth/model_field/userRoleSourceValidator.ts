import { v } from "convex/values"
import { userRoleSource } from "#src/auth/model_field/userRoleSource.ts"

export const userRoleSourceValidator = v.literal(userRoleSource.zitadel)
