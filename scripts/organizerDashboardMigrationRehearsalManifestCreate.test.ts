import { describe, expect, test } from "bun:test"
import { organizerDashboardMigrationRehearsalManifestCreate } from "./organizerDashboardMigrationRehearsalManifestCreate.ts"

const validManifest = {
  orgInits: [{ orgId: "kn78b35rz74bj9zscew6fa790d8gnfsp", kind: "verein" }],
  eventAssignments: [{ eventKey: "local-rehearsal-target", orgId: "kn78b35rz74bj9zscew6fa790d8gnfsp" }],
  roleAssignments: [],
}

describe("organizerDashboardMigrationRehearsalManifestCreate", () => {
  test("accepts a well-formed local-test manifest", () => {
    const result = organizerDashboardMigrationRehearsalManifestCreate(validManifest)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.eventAssignments).toHaveLength(1)
  })

  test("refuses an empty event key", () => {
    const result = organizerDashboardMigrationRehearsalManifestCreate({
      ...validManifest,
      eventAssignments: [{ eventKey: "  ", orgId: "kn78b35rz74bj9zscew6fa790d8gnfsp" }],
    })
    expect(result.success).toBe(false)
  })

  test("refuses an unknown organization kind", () => {
    const result = organizerDashboardMigrationRehearsalManifestCreate({
      ...validManifest,
      orgInits: [{ orgId: "kn78b35rz74bj9zscew6fa790d8gnfsp", kind: "konzern" }],
    })
    expect(result.success).toBe(false)
  })

  test("refuses a non-object manifest", () => {
    const result = organizerDashboardMigrationRehearsalManifestCreate("not-a-manifest")
    expect(result.success).toBe(false)
  })
})
