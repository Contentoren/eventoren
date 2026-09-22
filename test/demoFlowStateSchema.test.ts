import { expect, test } from "bun:test"
import * as v from "valibot"
import { demoFlowStateList } from "../src/demo/model/demoFlowStateList.ts"
import { demoFlowStateSchema } from "../src/demo/model/demoFlowStateSchema.ts"
import { demoFlowStateText } from "../src/demo/model/demoFlowStateText.ts"

test("demoFlowStateSchema accepts valid flow states", () => {
  for (const state of demoFlowStateList) {
    const result = v.safeParse(demoFlowStateSchema, state)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.output).toBe(state)
    }
  }
})

test("demoFlowStateSchema rejects invalid flow states", () => {
  const invalid = ["unknown", "", "idle", "pending", 123, null, undefined, {}]
  for (const item of invalid) {
    const result = v.safeParse(demoFlowStateSchema, item)
    expect(result.success).toBe(false)
  }
})

test("demoFlowStateList contains the 4 standard states", () => {
  expect(demoFlowStateList).toEqual(["loaded", "loading", "empty", "error"])
})

test("demoFlowStateText provides German copy", () => {
  expect(demoFlowStateText("loaded")).toBe("Geladen")
  expect(demoFlowStateText("loading")).toBe("Lädt")
  expect(demoFlowStateText("empty")).toBe("Leer")
  expect(demoFlowStateText("error")).toBe("Fehler")
})
