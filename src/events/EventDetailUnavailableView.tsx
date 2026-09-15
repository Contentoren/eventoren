import type { ParentComponent } from "solid-js"
import { Dynamic } from "solid-js/web"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export function EventDetailUnavailableView(props: { readonly frame?: ParentComponent } = {}) {
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
        </UiContainer>
      </main>
    </Dynamic>
  )
}
