import { SiteHeaderMobileMenu } from "../../components/SiteHeaderMobileMenu.tsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { demoText } from "../model/demoText.ts"
import { demoNavigationMenuStateCreate } from "../state/demoNavigationMenuStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoNavigationMenu() {
  const state = demoNavigationMenuStateCreate()

  return (
    <DemoShell currentId="navigation-menu">
      <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-indigo-600">{demoText("navigationEyebrow")}</p>
        <h1 class="mt-2 text-3xl font-bold">{demoText("navigationTitle")}</h1>
        <p class="mt-4 max-w-2xl text-slate-600">{demoText("navigationDescription")}</p>
        <Button class="mt-6" onClick={state.reopen}>
          {demoText("navigationOpen")}
        </Button>
      </section>
      <SiteHeaderMobileMenu
        open={state.open()}
        links={state.links()}
        onClose={state.close}
        linkHref={(link) => state.href(link.to)}
      />
    </DemoShell>
  )
}
