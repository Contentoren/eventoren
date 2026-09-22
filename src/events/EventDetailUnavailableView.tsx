import { Link } from "@tanstack/solid-router"
import type { ParentComponent } from "solid-js"
import { Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export function EventDetailUnavailableView(
  props: { readonly frame?: ParentComponent; readonly catalogHref?: string } = {},
) {
  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1">
        <UiContainer class="py-space-7">
          <p
            role="alert"
            class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
          >
            Das Event ist gerade nicht verfügbar. Bitte versuche es später erneut.
          </p>
          <Show when={props.catalogHref}>
            {(catalogHref) => (
              <div class="mt-space-4">
                <Link
                  to={catalogHref()}
                  class="focus-ring inline-flex h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent hover:bg-brand-soft"
                >
                  Zurück zum Eventkatalog
                </Link>
              </div>
            )}
          </Show>
        </UiContainer>
      </main>
    </Dynamic>
  )
}
