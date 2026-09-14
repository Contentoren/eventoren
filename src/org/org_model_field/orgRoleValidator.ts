import { v } from "convex/values"
import { orgRole } from "#src/org/org_model_field/orgRole.ts"

export const orgRoleValidator = v.union(v.literal(orgRole.member), v.literal(orgRole.guest))
