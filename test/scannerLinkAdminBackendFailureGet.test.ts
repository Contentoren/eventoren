import { expect, test } from "bun:test"
import { scannerLinkAdminBackendFailureGet } from "../src/admin/scannerLinkAdminBackendFailureGet.ts"

test("missing preview scanner-link mutation reports a backend deployment problem without exposing the Convex error", () => {
  const failure = scannerLinkAdminBackendFailureGet(
    "scannerLinkAdminCreate",
    new Error(
      "[Request ID: example] Server Error\nCould not find function for 'scannerLinks:scannerLinkAdminCreateMutation'. Did you forget to run `npx convex dev`?",
    ),
  )
  expect(failure.success).toBe(false)
  expect(failure.errorMessage).toContain("fehlen im Backend")
  expect(failure.errorMessage).not.toContain("Request ID")
})

test("a missing scanner-link list query is distinguished from other transport failures", () => {
  const missing = scannerLinkAdminBackendFailureGet(
    "scannerLinkAdminList",
    new Error("Could not find function for 'scannerLinks:scannerLinkAdminListQuery'"),
  )
  const network = scannerLinkAdminBackendFailureGet("scannerLinkAdminList", new Error("Failed to fetch"))
  expect(missing.errorMessage).toContain("fehlen im Backend")
  expect(network.errorMessage).toContain("nicht erreichbar")
})
