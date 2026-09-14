import type { DemoScenario } from "./demoScenarioSchema.js"

export const demoScenarios: DemoScenario[] = [
  {
    id: "directory",
    path: "/demo",
    title: "Demo directory",
    detail: "Browse the local application fixture",
  },
  {
    id: "xyz",
    path: "/demo/xyz",
    title: "Workspace pulse",
    detail: "Review a project brief and update local task state",
  },
]
