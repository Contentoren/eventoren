import { mdiChevronRight } from "@adaptive-ds/mdi/mdiChevronRight.js"
import { For, Show } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { Icon } from "#ui/static/icon/Icon.tsx"

export function ContentBreadcrumbs(props: {
  readonly label: string
  readonly items: readonly { readonly label: string; readonly href: string | null }[]
}) {
  return (
    <nav aria-label={props.label} class="text-sm text-content-muted">
      <ol class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <For each={props.items}>
          {(item, index) => (
            <li class="flex min-w-0 items-center gap-1.5">
              <Show when={index() > 0}>
                <Icon path={mdiChevronRight} class="size-4 shrink-0 text-content-muted/70" />
              </Show>
              <Show
                when={item.href}
                fallback={
                  <span aria-current="page" class="line-clamp-1 font-medium text-content">
                    {item.label}
                  </span>
                }
              >
                {(href) => (
                  <LinkTextInternal
                    to={href() as never}
                    class="break-normal text-content-muted hover:text-brand-strong"
                  >
                    {item.label}
                  </LinkTextInternal>
                )}
              </Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  )
}
