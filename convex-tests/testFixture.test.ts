/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"
import { testFixtureJobsRead } from "./testFixtureJobsRead.js"

const modules = import.meta.glob("../convex/**/*.ts")

afterEach(() => {
  vi.useRealTimers()
})

test("triggers and drains a chained scheduled Convex function", async () => {
  vi.useFakeTimers()

  const t = convexTest(schema, modules)
  const scheduledId = await t.mutation(internal.testFixtureStart.testFixtureStart, { value: "convex-test" })
  expect(scheduledId).toBeDefined()

  const pendingJobs = await testFixtureJobsRead(t)
  expect(pendingJobs).toMatchObject([
    {
      args: [{ value: "convex-test:step" }],
      state: { kind: "pending" },
    },
  ])

  await t.finishAllScheduledFunctions(vi.runAllTimers)

  const completedJobs = await testFixtureJobsRead(t)
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

test("scheduled job fixture consumer traverses every cursor page", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 30; index += 1) {
      await ctx.scheduler.runAfter(60_000 + index, internal.testFixtureStart.testFixtureStart, {
        value: `page-${index}`,
      })
    }
  })
  const jobs = await testFixtureJobsRead(t)
  expect(jobs).toHaveLength(30)
  expect(jobs.map((job) => job.args[0].value).sort()).toEqual(
    Array.from({ length: 30 }, (_, index) => `page-${index}`).sort(),
  )
})
