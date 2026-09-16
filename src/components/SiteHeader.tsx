import { Link, useNavigate } from "@tanstack/solid-router"
import type { Accessor } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { LanguageSelector } from "../app/i18n/LanguageSelector.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { SiteHeaderCartButton } from "./SiteHeaderCartButton.tsx"
import { SiteHeaderLogo } from "./SiteHeaderLogo.tsx"
import { SiteHeaderMobileMenu } from "./SiteHeaderMobileMenu.tsx"
import { SiteHeaderSkipLink } from "./SiteHeaderSkipLink.tsx"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"
import { siteHeaderStateCreate } from "./siteHeaderStateCreate.ts"

export function SiteHeader(
  props: {
    readonly session?: { readonly role?: UserRole } | Accessor<{ readonly role?: UserRole } | undefined>
    readonly navLinkHref?: (link: SiteHeaderNavLink) => string
    readonly logoHref?: string
    readonly cartHref?: string
    readonly checkoutHref?: string
    readonly cartQuantity?: Accessor<number>
    readonly navLinkIsActive?: (link: SiteHeaderNavLink, href: string, pathname: string) => boolean
    readonly cartIsActive?: (href: string, pathname: string) => boolean
  } = {},
) {
  const navigate = useNavigate()
  const state = siteHeaderStateCreate({
    session: props.session,
    cartQuantity: props.cartQuantity,
    navLinkIsActive: props.navLinkIsActive,
    cartIsActive: props.cartIsActive,
  })

  return (
    <header class="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/90 text-content backdrop-blur-xl">
      <SiteHeaderSkipLink />

      <UiContainer width="wide" class="max-md:px-space-3">
        <div class="flex h-16 items-center justify-between gap-space-5 max-md:gap-space-2">
          <SiteHeaderLogo class="max-md:px-space-1" href={props.logoHref} />

          <nav aria-label="Main navigation" class="max-md:hidden">
            <ul class="flex items-center gap-space-1">
              <For each={state.navLinks()}>
                {(link) => (
                  <li>
                    <Show
                      when={props.navLinkHref}
                      fallback={
                        <Link
                          to={link.to}
                          activeOptions={{ exact: link.exact }}
                          activeProps={{ class: "bg-brand-soft text-brand-accent", "aria-current": "page" }}
                          inactiveProps={{ class: "text-content-muted hover:bg-surface-muted hover:text-content" }}
                          class="focus-ring rounded-control px-space-3 py-space-2 text-sm font-semibold transition-colors"
                        >
                          {link.label}
                        </Link>
                      }
                    >
                      {(linkHref) => {
                        const href = linkHref()(link)
                        const active = state.navLinkIsActive(link, href)
                        return (
                          <Link
                            to={href}
                            aria-current={active ? "page" : undefined}
                            class={`focus-ring rounded-control px-space-3 py-space-2 text-sm font-semibold transition-colors ${
                              active
                                ? "bg-brand-soft text-brand-accent"
                                : "text-content-muted hover:bg-surface-muted hover:text-content"
                            }`}
                          >
                            {link.label}
                          </Link>
                        )
                      }}
                    </Show>
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
              href={props.cartHref}
              active={props.cartHref ? state.pathIsActive(props.cartHref) : undefined}
              class="max-md:px-space-2"
            />

            <Show
              when={props.checkoutHref}
              fallback={
                <Button
                  size="sm"
                  variant="none"
                  class="bg-brand text-brand-content hover:bg-brand-strong max-sm:hidden sm:inline-flex"
                  disabled={!state.cartHasItems()}
                  onClick={() => navigate({ to: "/checkout" })}
                >
                  Zur Kasse
                </Button>
              }
            >
              {(checkoutHref) => (
                <Link
                  to={checkoutHref()}
                  aria-disabled={!state.cartHasItems()}
                  class="inline-flex h-10 items-center justify-center rounded-control bg-brand px-space-4 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong max-sm:hidden sm:inline-flex"
                  classList={{ "pointer-events-none opacity-50": !state.cartHasItems() }}
                >
                  Zur Kasse
                </Link>
              )}
            </Show>

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

      <SiteHeaderMobileMenu
        open={state.isMenuOpen()}
        links={state.navLinks()}
        onClose={() => state.closeOverlay()}
        linkHref={props.navLinkHref}
        isLinkActive={props.navLinkHref ? state.navLinkIsActive : undefined}
      />
    </header>
  )
}
