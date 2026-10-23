import { defineTable } from "convex/server"
import { v } from "convex/values"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerTerminationRequestSchema } from "./organizerTerminationRequestSchema.ts"
export const organizerTerminationTables = {
  organizerTerminationRequests: defineTable({
    ...valibotToConvex(organizerTerminationRequestSchema.pipe[0].entries),
    receivedAt: v.string(),
    declaration: v.string(),
  }).index("requestKey", ["requestKey"]),
  organizerTerminationDeliveries: defineTable({
    requestId: v.id("organizerTerminationRequests"),
    userSent: v.boolean(),
    operatorSent: v.boolean(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    attempts: v.number(),
    updatedAt: v.number(),
    lastError: v.optional(v.string()),
  }).index("requestId", ["requestId"]),
}
