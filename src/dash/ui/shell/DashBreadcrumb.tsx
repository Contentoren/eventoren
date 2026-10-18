import { mdiChevronRight } from "@adaptive-ds/mdi/mdiChevronRight.js"
import { useLocation } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashBreadcrumbStateCreate } from "./dashBreadcrumbStateCreate.ts"

export function DashBreadcrumb() {
  const location = useLocation()
  const state = dashBreadcrumbStateCreate(() => location().pathname)
  const crumbs = () => state.crumbs()
  const last = () => crumbs()[crumbs().length - 1]
  return (
    <nav aria-label="Brotkrumen" class="min-w-0">
      <ol class="hidden min-w-0 items-center gap-1 text-sm sm:flex">
        <For each={crumbs()}>
          {(crumb, index) => (
            <li class="flex min-w-0 items-center gap-1">
              <Show when={index() > 0}>
                <Icon path={mdiChevronRight} class="size-4 shrink-0 text-content-muted" />
              </Show>
              <Show
                when={crumb.to && index() < crumbs().length - 1}
                fallback={<span class="truncate font-medium text-content">{crumb.label}</span>}
              >
                <LinkTextInternal to={crumb.to as string} class="truncate text-content-muted">
                  {crumb.label}
                </LinkTextInternal>
              </Show>
            </li>
          )}
        </For>
      </ol>
      <Show when={last()}>
        {(item) => <p class="truncate text-sm font-medium text-content sm:hidden">{item().label}</p>}
      </Show>
    </nav>
  )
}
