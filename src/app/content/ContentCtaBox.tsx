import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { For } from "solid-js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.ts"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.tsx"
import { Icon } from "#ui/static/icon/Icon.tsx"
import type { contentCtaConfig } from "./contentCtaConfig.ts"

/** CTA box after an article (organiser or buyer variant). Uses an h2 so the page keeps a single h1. */
export function ContentCtaBox(props: { readonly cta: (typeof contentCtaConfig)["de"]["organiser"] }) {
  return (
    <aside class="rounded-card border border-brand/30 bg-brand-soft/60 p-6 sm:p-8">
      <h2 class="text-xl font-bold tracking-tight text-content sm:text-2xl">{props.cta.heading}</h2>
      <p class="mt-3 leading-relaxed text-content-muted">{props.cta.text}</p>
      <ul class="mt-4 grid gap-2">
        <For each={props.cta.facts}>
          {(fact) => (
            <li class="flex items-start gap-2 text-sm text-content">
              <Icon path={mdiCheckCircle} class="mt-0.5 size-4 shrink-0 text-brand" />
              {fact}
            </li>
          )}
        </For>
      </ul>
      <div class="mt-6 flex flex-wrap gap-3">
        <For each={props.cta.actions}>
          {(action) => (
            <LinkButtonInternal
              to={action.href}
              variant={action.primary ? buttonVariant.none : buttonVariant.outline}
              class={
                action.primary
                  ? "bg-brand px-4 py-2 text-brand-content hover:bg-brand-strong"
                  : "bg-surface px-4 py-2 text-content"
              }
            >
              {action.label}
            </LinkButtonInternal>
          )}
        </For>
      </div>
    </aside>
  )
}
