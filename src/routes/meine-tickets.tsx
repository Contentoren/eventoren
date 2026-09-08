import { createFileRoute, Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { SiteFrame } from "../components/SiteFrame"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import { myTicketsPageStateCreate } from "../ticketing/myTicketsPageStateCreate.ts"
import { TicketOrderList } from "../ticketing/TicketOrderList.tsx"
import { ticketWalletViewSearchParse } from "../ticketing/ticketWalletViewSearchParse.ts"
import { classArr } from "../ui/classArr.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/meine-tickets")({
  head: () => seoHeadCreate("/meine-tickets"),
  validateSearch: ticketWalletViewSearchParse,
  component: MyTicketsPage,
})

function MyTicketsPage() {
  const state = myTicketsPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <div class="flex flex-col gap-space-3">
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Meine Tickets</h1>
            <p class="text-base text-content-muted">{state.hintLabel()}</p>
          </div>

          <fieldset class="flex flex-wrap gap-space-3 border-0 p-0">
            <legend class="sr-only">Ansicht wählen</legend>
            <For each={state.viewOptions()}>
              {(option) => (
                <button
                  type="button"
                  aria-pressed={state.view() === option.value}
                  onClick={() => state.selectView(option.value)}
                  class={classArr(
                    "focus-ring rounded-control px-space-4 py-space-2 text-sm font-medium transition-colors",
                    state.view() === option.value
                      ? "bg-brand text-brand-content"
                      : "bg-surface-muted text-content-muted ring-1 ring-inset ring-border-strong hover:text-content hover:ring-brand-accent",
                  )}
                >
                  {option.label}
                </button>
              )}
            </For>
          </fieldset>

          <div class={state.listClass()}>
            <TicketOrderList />
          </div>

          <Link
            to="/"
            class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4 hover:text-content"
          >
            Weitere Events entdecken
          </Link>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
