/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")

test("reads public project identity without authentication", async () => {
  const t = convexTest(schema, modules)
  const result = await t.query(api.publicProjectInfo.publicProjectInfo, {})

  expect(result).toEqual({
    projectName: "eventoren",
    serverTimestamp: expect.any(Number),
  })
})
