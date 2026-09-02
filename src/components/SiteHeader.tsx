import { Link } from "@tanstack/solid-router"
import { UiButton } from "../ui/UiButton.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { SiteHeaderAuthDialog } from "./SiteHeaderAuthDialog.tsx"
import { SiteHeaderCartButton } from "./SiteHeaderCartButton.tsx"
import { SiteHeaderLocalePicker } from "./SiteHeaderLocalePicker.tsx"
import { SiteHeaderLogo } from "./SiteHeaderLogo.tsx"
import { SiteHeaderMobileMenu } from "./SiteHeaderMobileMenu.tsx"
import { SiteHeaderSkipLink } from "./SiteHeaderSkipLink.tsx"
import { siteHeaderStateCreate } from "./siteHeaderStateCreate.ts"

export function SiteHeader() {
  const state = siteHeaderStateCreate()

  return (
    <header class="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/90 text-content backdrop-blur-xl">
      <SiteHeaderSkipLink />

      <UiContainer width="wide" class="max-md:px-space-3">
        <div class="flex h-16 items-center justify-between gap-space-5 max-md:gap-space-2">
          <SiteHeaderLogo class="max-md:px-space-1" />

          <div class="flex items-center gap-space-1 max-md:gap-0">
            <SiteHeaderLocalePicker
              open={state.isLocaleOpen()}
              label={state.localeLabel()}
              locale={state.locale()}
              options={state.localeOptions()}
              onToggle={() => state.openLocalePicker()}
              onClose={() => state.closeOverlay()}
              onSelect={(locale) => state.selectLocale(locale)}
              class="max-md:px-space-2"
            />

            <Link
              to="/kontakt"
              class="focus-ring hidden h-10 items-center rounded-control px-space-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted lg:inline-flex"
            >
              Kontakt
            </Link>

            <SiteHeaderCartButton
              quantity={state.cartQuantity()}
              label={state.cartLabel()}
              hasItems={state.cartHasItems()}
              class="max-md:px-space-2"
            />

            <Link
              to="/meine-tickets"
              activeProps={{ class: "bg-surface-muted", "aria-current": "page" }}
              class="focus-ring hidden h-10 items-center gap-space-2 rounded-control px-space-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted md:inline-flex"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
                <path
                  d="M4 9V7a1 1 0 011-1h14a1 1 0 011 1v2a2.5 2.5 0 000 5v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3a2.5 2.5 0 000-5z"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>
              Meine Tickets
            </Link>

            <UiButton size="sm" class="ml-space-2 max-sm:hidden sm:inline-flex" onClick={() => state.openAuth()}>
              Anmelden
            </UiButton>

            <button
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
            </button>
          </div>
        </div>
      </UiContainer>

      <SiteHeaderAuthDialog open={state.isAuthOpen()} onClose={() => state.closeOverlay()} />

      <SiteHeaderMobileMenu
        open={state.isMenuOpen()}
        links={state.navLinks()}
        localeOpen={state.isMobileLocaleOpen()}
        locale={state.locale()}
        localeLabel={state.localeLabel()}
        localeOptions={state.localeOptions()}
        onToggleLocale={() => state.toggleMobileLocalePicker()}
        onCloseLocale={() => state.closeMobileLocalePicker()}
        onSelectLocale={(locale) => state.selectLocale(locale)}
        onClose={() => state.closeOverlay()}
        onOpenAuth={() => state.openAuth()}
      />
    </header>
  )
}
