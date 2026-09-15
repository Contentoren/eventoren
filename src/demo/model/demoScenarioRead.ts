import type { DemoScenario } from "./demoScenarioSchema.js"
import { demoScenarios } from "./demoScenarios.js"

export function demoScenarioRead(pathname: string): DemoScenario {
  const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  return demoScenarios.find((scenario) => scenario.path === normalized) ?? demoScenarios[0]
}
