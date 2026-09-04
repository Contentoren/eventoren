import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { UiDrawer } from "../ui/UiDrawer.tsx"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"
import { siteHeaderMobileMenuStateCreate } from "./siteHeaderMobileMenuStateCreate.ts"

export function SiteHeaderMobileMenu(props: {
  open: boolean
  links: readonly SiteHeaderNavLink[]
  onClose: () => void
  onOpenAuth: () => void
}) {
  const state = siteHeaderMobileMenuStateCreate({
    onClose: () => props.onClose(),
    onOpenAuth: () => props.onOpenAuth(),
  })

  return (
    <UiDrawer open={props.open} onClose={() => props.onClose()} title="Menü">
      <div class="flex flex-1 flex-col justify-between gap-space-6">
        <nav aria-label="Mobile Navigation">
          <ul class="flex flex-col gap-space-2">
            <For each={props.links}>
              {(link) => (
                <li>
                  <Link
                    to={link.to}
                    activeOptions={{ exact: link.exact }}
                    activeProps={{ class: "bg-brand-soft text-brand-accent", "aria-current": "page" }}
                    inactiveProps={{ class: "text-content hover:bg-surface-muted" }}
                    onClick={state.handleLinkClick}
                    class="focus-ring flex min-h-11 items-center rounded-control px-space-4 text-base font-semibold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              )}
            </For>
          </ul>
        </nav>

        <div class="mt-auto flex flex-col gap-space-3 border-t border-border-subtle pt-space-5">
          <UiButton size="md" block onClick={state.handleOpenAuth}>
            Anmelden / Registrieren
          </UiButton>
        </div>
      </div>
    </UiDrawer>
  )
}
