import { Link, useNavigate } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LanguageSelector } from "../app/i18n/LanguageSelector.tsx"
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

          <nav aria-label="Main navigation" class="max-md:hidden">
            <ul class="flex items-center gap-space-1">
              <For each={state.navLinks()}>
                {(link) => (
                  <li>
                    <Link
                      to={link.to}
                      activeOptions={{ exact: link.exact }}
                      activeProps={{ class: "bg-brand-soft text-brand-accent", "aria-current": "page" }}
                      inactiveProps={{ class: "text-content-muted hover:bg-surface-muted hover:text-content" }}
                      class="focus-ring rounded-control px-space-3 py-space-2 text-sm font-semibold transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                )}
              </For>
            </ul>
          </nav>

          <div class="flex items-center gap-2 max-md:gap-0">
            <LanguageSelector />
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
