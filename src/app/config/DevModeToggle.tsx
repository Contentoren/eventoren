import { mdiCodeBraces } from "@adaptive-ds/mdi/mdiCodeBraces.js"
import { mdiCodeJson } from "@adaptive-ds/mdi/mdiCodeJson.js"
import { hasDevMode } from "#src/app/config/hasDevMode.ts"
import { inDevModeSignal, onDevModeSignalRegisterHandler } from "#src/app/config/inDevModeSignal.ts"
import { ttt } from "#ui/i18n/ttt.ts"
import { ToggleButtonIconOnly } from "#ui/interactive/toggle/ToggleButtonIconOnly.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.ts"

export function DevModeToggle(p: MayHaveClass) {
  if (!hasDevMode()) return null
  onDevModeSignalRegisterHandler()
  return (
    <ToggleButtonIconOnly
      title={ttt("In Dev Mode:") + " " + (inDevModeSignal.get() ? ttt("Active") : ttt("Disabled"))}
      pressedSignal={inDevModeSignal}
      icon={inDevModeSignal.get() ? mdiCodeJson : mdiCodeBraces}
      class={p.class}
    />
  )
}
