import type { TestConvex } from "convex-test"
import { internal } from "../convex/_generated/api.js"
import type schema from "../convex/schema.js"

export const testFixtureJobsRead = async (t: TestConvex<typeof schema>) => {
  const jobs = []
  let cursor: string | null = null
  let isDone = false
  while (!isDone) {
    const result = await t.query(internal.testFixtureJobs.testFixtureJobs, { paginationOpts: { cursor, numItems: 25 } })
    jobs.push(...result.page)
    cursor = result.continueCursor
    isDone = result.isDone
  }
  return jobs
}
