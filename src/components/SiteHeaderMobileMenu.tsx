import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import type { SiteLocale } from "../locale/SiteLocale.ts"
import { UiButton } from "../ui/UiButton.tsx"
import { UiDialog } from "../ui/UiDialog.tsx"
import { SiteHeaderLocalePicker } from "./SiteHeaderLocalePicker.tsx"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export function SiteHeaderMobileMenu(props: {
  open: boolean
  links: readonly SiteHeaderNavLink[]
  localeOpen: boolean
  locale: SiteLocale
  localeLabel: string
  localeOptions: readonly SiteLocale[]
  onToggleLocale: () => void
  onCloseLocale: () => void
  onSelectLocale: (locale: SiteLocale) => void
  onClose: () => void
  onOpenAuth: () => void
}) {
  return (
    <UiDialog open={props.open} onClose={() => props.onClose()} title="Menü" width="sm">
      <nav aria-label="Mobile Navigation">
        <ul class="flex flex-col gap-space-1">
          <For each={props.links}>
            {(link) => (
              <li>
                <Link
                  to={link.to}
                  activeOptions={{ exact: link.exact }}
                  activeProps={{ class: "bg-brand-soft text-brand-accent", "aria-current": "page" }}
                  inactiveProps={{ class: "text-content hover:bg-surface-muted" }}
                  onClick={() => props.onClose()}
                  class="focus-ring flex h-11 items-center rounded-control px-space-4 text-sm font-semibold transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <div class="flex flex-col gap-space-3 border-t border-border-subtle pt-space-5">
        <UiButton
          size="md"
          block
          onClick={() => {
            props.onClose()
            props.onOpenAuth()
          }}
        >
          Anmelden / Registrieren
        </UiButton>

        <div class="border-t border-border-subtle pt-space-5">
          <SiteHeaderLocalePicker
            open={props.localeOpen}
            label={props.localeLabel}
            locale={props.locale}
            options={props.localeOptions}
            onToggle={() => props.onToggleLocale()}
            onClose={() => props.onCloseLocale()}
            onSelect={(locale) => props.onSelectLocale(locale)}
            class="w-full justify-center"
          />
        </div>
      </div>
    </UiDialog>
  )
}
