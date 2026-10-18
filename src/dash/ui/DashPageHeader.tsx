import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.jsx"

export interface DashPageHeaderProps {
  title: string
  description?: string
  meta?: JSX.Element
  actions?: JSX.Element
  back?: { href: string; label: string }
}

export function DashPageHeader(p: DashPageHeaderProps) {
  return (
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <Show when={p.back}>
          {(back) => (
            <LinkTextInternal to={back().href} class="mb-1 inline-block text-sm text-content-muted">
              {`‹ ${back().label}`}
            </LinkTextInternal>
          )}
        </Show>
        <h1 class="truncate text-xl font-semibold tracking-tight text-content sm:text-2xl">{p.title}</h1>
        <Show when={p.description}>
          <p class="mt-1 text-sm text-content-muted">{p.description}</p>
        </Show>
        <Show when={p.meta}>
          <div class="mt-2 flex flex-wrap gap-1.5">{p.meta}</div>
        </Show>
      </div>
      <Show when={p.actions}>
        <div class="flex shrink-0 flex-wrap gap-2">{p.actions}</div>
      </Show>
    </header>
  )
}
