import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { UiDrawer } from "../ui/UiDrawer.tsx"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export function SiteHeaderMobileMenu(props: {
  open: boolean
  links: readonly SiteHeaderNavLink[]
  onClose: () => void
  linkHref?: (link: SiteHeaderNavLink) => string
}) {
  return (
    <UiDrawer open={props.open} onClose={() => props.onClose()} title="Menü">
      <div class="flex flex-1 flex-col justify-between gap-space-6">
        <nav aria-label="Mobile Navigation">
          <ul class="flex flex-col gap-space-2">
            <For each={props.links}>
              {(link) => (
                <li>
                  <Show
                    when={props.linkHref}
                    fallback={
                      <Link
                        to={link.to}
                        activeOptions={{ exact: link.exact }}
                        activeProps={{ class: "bg-brand-soft text-brand-accent", "aria-current": "page" }}
                        inactiveProps={{ class: "text-content hover:bg-surface-muted" }}
                        onClick={() => props.onClose()}
                        class="focus-ring flex min-h-11 items-center rounded-control px-space-4 text-base font-semibold transition-colors"
                      >
                        {link.label}
                      </Link>
                    }
                  >
                    {(linkHref) => (
                      <a
                        href={linkHref()(link)}
                        onClick={() => props.onClose()}
                        class="focus-ring flex min-h-11 items-center rounded-control px-space-4 text-base font-semibold transition-colors hover:bg-surface-muted"
                      >
                        {link.label}
                      </a>
                    )}
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </nav>
      </div>
    </UiDrawer>
  )
}
