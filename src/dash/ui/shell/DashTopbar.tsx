import { mdiMenu } from "@adaptive-ds/mdi/mdiMenu.js"
import type { JSX } from "solid-js"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ThemeButton } from "#ui/interactive/theme/ThemeButton.jsx"
import { DashBreadcrumb } from "./DashBreadcrumb.tsx"

export interface DashTopbarProps {
  actions?: JSX.Element
  onMenuOpen?: () => void
}

export function DashTopbar(p: DashTopbarProps) {
  return (
    <div class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface/80 px-4 backdrop-blur lg:px-8">
      <ButtonIconOnly
        icon={mdiMenu}
        variant={buttonVariant.ghost}
        aria-label="Menü öffnen"
        title="Menü öffnen"
        class="lg:hidden"
        onClick={() => p.onMenuOpen?.()}
      />
      <div class="min-w-0 flex-1">
        <DashBreadcrumb />
      </div>
      {p.actions}
      <ThemeButton />
    </div>
  )
}
