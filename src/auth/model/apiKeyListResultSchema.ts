import { resultErrSchema } from "@adaptive-ds/result"
import * as a from "valibot"
import { apiKeyListItemSchema } from "./apiKeyListItemSchema.ts"

export const apiKeyListResultSchema = a.union([
  a.object({
    success: a.literal(true),
    data: a.object({
      page: a.array(apiKeyListItemSchema),
      isDone: a.boolean(),
      continueCursor: a.string(),
    }),
  }),
  resultErrSchema,
])

export type ApiKeyListResult = a.InferOutput<typeof apiKeyListResultSchema>
