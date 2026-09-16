import { expect, test } from "bun:test"

test("DemoRouteShell is the single demo controls owner", async () => {
  const routeShellSource = await Bun.file(new URL("../src/demo/ui/DemoRouteShell.tsx", import.meta.url)).text()
  const scenarioFrameSource = await Bun.file(new URL("../src/demo/ui/DemoScenarioFrame.tsx", import.meta.url)).text()
  const siteFrameSource = await Bun.file(new URL("../src/demo/ui/DemoSiteFrame.tsx", import.meta.url)).text()

  expect(routeShellSource.match(/<DemoControls\b/g)).toHaveLength(1)
  expect(scenarioFrameSource).not.toContain("DemoControls")
  expect(siteFrameSource).not.toContain("DemoControls")
})
