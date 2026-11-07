import { For } from "solid-js"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.tsx"

/** Ordered list of `##` section links; shared by the sticky desktop TOC and the mobile disclosure. */
export function ContentToc(props: {
  readonly label: string
  readonly items: readonly { readonly id: string; readonly text: string; readonly href: string }[]
}) {
  return (
    <nav aria-label={props.label}>
      <ol class="grid gap-0.5 border-l border-border-subtle pl-3">
        <For each={props.items}>
          {(item) => (
            <li>
              <LinkTextExternal
                href={item.href}
                class="block break-normal rounded-md px-2.5 py-1.5 text-sm leading-snug text-content-muted hover:bg-surface-muted hover:text-brand-strong hover:no-underline"
              >
                {item.text}
              </LinkTextExternal>
            </li>
          )}
        </For>
      </ol>
    </nav>
  )
}
