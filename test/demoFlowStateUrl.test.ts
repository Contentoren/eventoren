import { expect, test } from "bun:test"
import { demoFlowStateUrlRead } from "../src/demo/model/demoFlowStateUrlRead.ts"
import { demoFlowUrlSync } from "../src/demo/model/demoFlowUrlSync.ts"

test("demoFlowStateUrlRead parses valid demoState from query strings", () => {
  expect(demoFlowStateUrlRead("?demoState=loading")).toBe("loading")
  expect(demoFlowStateUrlRead("demoState=empty")).toBe("empty")
  expect(demoFlowStateUrlRead("?foo=bar&demoState=error")).toBe("error")
  expect(demoFlowStateUrlRead(new URLSearchParams("demoState=loaded"))).toBe("loaded")
})

test("demoFlowStateUrlRead returns undefined for missing or invalid values", () => {
  expect(demoFlowStateUrlRead("")).toBeUndefined()
  expect(demoFlowStateUrlRead(undefined)).toBeUndefined()
  expect(demoFlowStateUrlRead("?demoState=unknown")).toBeUndefined()
  expect(demoFlowStateUrlRead("?demoState=")).toBeUndefined()
  expect(demoFlowStateUrlRead("?other=123")).toBeUndefined()
})

test("demoFlowUrlSync executes safely in any environment without errors", () => {
  expect(() => demoFlowUrlSync("loading", "loaded")).not.toThrow()
  expect(() => demoFlowUrlSync("loaded", "loaded")).not.toThrow()
})
