import type { DemoFlowState } from "./demoFlowStateSchema.ts"

export function demoFlowStateText(state: DemoFlowState): string {
  switch (state) {
    case "loaded":
      return "Geladen"
    case "loading":
      return "Lädt"
    case "empty":
      return "Leer"
    case "error":
      return "Fehler"
  }
}
