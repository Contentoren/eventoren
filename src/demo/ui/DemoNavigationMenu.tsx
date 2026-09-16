import { SiteHeaderMobileMenu } from "../../components/SiteHeaderMobileMenu.tsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { demoText } from "../model/demoText.ts"
import { demoNavigationMenuStateCreate } from "../state/demoNavigationMenuStateCreate.ts"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoNavigationMenu() {
  const state = demoNavigationMenuStateCreate()

  return (
    <DemoSiteFrame currentId="navigation-menu" sessionRole="admin">
      <main id="content" tabindex="-1">
        <UiContainer class="py-space-8">
          <section class="rounded-card border border-border-subtle bg-surface p-space-6 shadow-sm sm:p-space-8">
            <p class="text-sm font-semibold uppercase tracking-wide text-brand-accent">
              {demoText("navigationEyebrow")}
            </p>
            <h1 class="mt-space-2 text-3xl font-bold">{demoText("navigationTitle")}</h1>
            <p class="mt-space-4 max-w-2xl text-content-muted">{demoText("navigationDescription")}</p>
            <Button class="mt-space-6" onClick={state.reopen}>
              {demoText("navigationOpen")}
            </Button>
          </section>
        </UiContainer>
      </main>
      <SiteHeaderMobileMenu
        open={state.open()}
        links={state.links()}
        onClose={state.close}
        linkHref={(link) => state.href(link.to)}
      />
    </DemoSiteFrame>
  )
}
