import type { DemoScenarioGroup } from "./demoScenarioGroupSchema.js"
import type { DemoScenario } from "./demoScenarioSchema.js"
import { demoScenarios } from "./demoScenarios.js"
import { demoText } from "./demoText.ts"

export function demoScenarioGroupListGet(
  scenarios: readonly DemoScenario[] = demoScenarios,
): readonly DemoScenarioGroup[] {
  const filtered = scenarios.filter((scenario) => scenario.id !== "directory")

  const customerScenarios = filtered.filter((scenario) => scenario.path.startsWith("/demo/customer/"))
  const platformScenarios = filtered.filter(
    (scenario) =>
      scenario.path === "/demo/dashboard" ||
      scenario.path.startsWith("/demo/dashboard/") ||
      scenario.path === "/demo/onboarding" ||
      scenario.path.startsWith("/demo/kasse/") ||
      scenario.path.startsWith("/demo/abendkasse/"),
  )
  const sharedCustomerPlatformAdminExcluded = new Set([
    ...customerScenarios.map((scenario) => scenario.id),
    ...platformScenarios.map((scenario) => scenario.id),
  ])
  const adminScenarios = filtered.filter(
    (scenario) => scenario.path.startsWith("/demo/admin/") && !sharedCustomerPlatformAdminExcluded.has(scenario.id),
  )
  const sharedScenarios = filtered.filter(
    (scenario) => !sharedCustomerPlatformAdminExcluded.has(scenario.id) && !scenario.path.startsWith("/demo/admin/"),
  )

  return [
    {
      id: "customer",
      title: demoText("groupCustomerTitle"),
      description: demoText("groupCustomerDescription"),
      entryPath: "/demo/customer/events",
      entryLabel: demoText("groupCustomerEntry"),
      scenarios: customerScenarios,
    },
    {
      id: "platform",
      title: demoText("groupPlatformTitle"),
      description: demoText("groupPlatformDescription"),
      entryPath: "/demo/dashboard",
      entryLabel: demoText("groupPlatformEntry"),
      scenarios: platformScenarios,
    },
    {
      id: "admin",
      title: demoText("groupAdminTitle"),
      description: demoText("groupAdminDescription"),
      entryPath: "/demo/admin/events",
      entryLabel: demoText("groupAdminEntry"),
      scenarios: adminScenarios,
    },
    {
      id: "shared",
      title: demoText("groupSharedTitle"),
      description: demoText("groupSharedDescription"),
      entryPath: "/demo/contact",
      entryLabel: demoText("groupSharedEntry"),
      scenarios: sharedScenarios,
    },
  ]
}
