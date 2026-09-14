import { useNavigate } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { SiteHeaderCartButton } from "./SiteHeaderCartButton.tsx"
import { SiteHeaderLogo } from "./SiteHeaderLogo.tsx"
import { SiteHeaderMobileMenu } from "./SiteHeaderMobileMenu.tsx"
import { SiteHeaderSkipLink } from "./SiteHeaderSkipLink.tsx"
import { siteHeaderStateCreate } from "./siteHeaderStateCreate.ts"

export function SiteHeader() {
  const navigate = useNavigate()
  const state = siteHeaderStateCreate()

  return (
    <header class="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/90 text-content backdrop-blur-xl">
      <SiteHeaderSkipLink />

      <UiContainer width="wide" class="max-md:px-space-3">
        <div class="flex h-16 items-center justify-between gap-space-5 max-md:gap-space-2">
          <SiteHeaderLogo class="max-md:px-space-1" />

          <div class="flex items-center gap-2 max-md:gap-0">
            <SiteHeaderCartButton
              quantity={state.cartQuantity()}
              label={state.cartLabel()}
              hasItems={state.cartHasItems()}
              class="max-md:px-space-2"
            />

            <Button
              size="sm"
              variant="none"
              class="bg-brand text-brand-content hover:bg-brand-strong max-sm:hidden sm:inline-flex"
              disabled={!state.cartHasItems()}
              onClick={() => navigate({ to: "/checkout" })}
            >
              Zur Kasse
            </Button>

            <Button
              variant="ghost"
              size="none"
              type="button"
              onClick={() => state.openMenu()}
              aria-haspopup="dialog"
              aria-expanded={state.isMenuOpen()}
              aria-label="Menü öffnen"
              class="focus-ring inline-flex size-10 items-center justify-center rounded-control text-content transition-colors hover:bg-surface-muted max-md:size-9 md:hidden"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" class="size-6" fill="none" stroke="currentColor">
                <path d="M4 7h16M4 12h16M4 17h16" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </Button>
          </div>
        </div>
      </UiContainer>

      <SiteHeaderMobileMenu open={state.isMenuOpen()} links={state.navLinks()} onClose={() => state.closeOverlay()} />
    </header>
  )
}
