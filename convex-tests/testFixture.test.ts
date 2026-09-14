/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")

afterEach(() => {
  vi.useRealTimers()
})

test("triggers and drains a chained scheduled Convex function", async () => {
  vi.useFakeTimers()

  const t = convexTest(schema, modules)
  const scheduledId = await t.mutation(internal.testFixtureStart.testFixtureStart, { value: "convex-test" })
  expect(scheduledId).toBeDefined()

  const pendingJobs = await t.query(internal.testFixtureJobs.testFixtureJobs, {})
  expect(pendingJobs).toMatchObject([
    {
      args: [{ value: "convex-test:step" }],
      state: { kind: "pending" },
    },
  ])

  await t.finishAllScheduledFunctions(vi.runAllTimers)

  const completedJobs = await t.query(internal.testFixtureJobs.testFixtureJobs, {})
  expect(completedJobs).toHaveLength(2)
  expect(completedJobs).toMatchObject([
    {
      args: [{ value: "convex-test:step" }],
      state: { kind: "success" },
    },
    {
      args: [{ value: "convex-test:step:complete" }],
      state: { kind: "success" },
    },
  ])
})
