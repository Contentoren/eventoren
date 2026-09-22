import * as v from "valibot"
import { demoScenarioSchema } from "./demoScenarioSchema.js"

export const demoScenarioGroupSchema = v.strictObject({
  id: v.picklist(["customer", "admin", "shared"]),
  title: v.pipe(v.string(), v.minLength(1)),
  description: v.pipe(v.string(), v.minLength(1)),
  entryPath: v.pipe(v.string(), v.minLength(1)),
  entryLabel: v.pipe(v.string(), v.minLength(1)),
  scenarios: v.array(demoScenarioSchema),
})

export type DemoScenarioGroup = v.InferOutput<typeof demoScenarioGroupSchema>
