import { demoScenarioGroupListGet } from "../model/demoScenarioGroupListGet.ts"
import { demoText } from "../model/demoText.ts"

export function demoShellStateCreate(input: { readonly currentId: () => string }) {
  const groups = () => demoScenarioGroupListGet()
  const title = () => demoText("shellTitle")
  const detail = () => demoText("shellDetail")
  const directoryLabel = () => demoText("shellDirectory")

  const isCurrent = (id: string) => input.currentId() === id

  return {
    groups,
    title,
    detail,
    directoryLabel,
    isCurrent,
  }
}
