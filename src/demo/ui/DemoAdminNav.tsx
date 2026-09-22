import { Link, useLocation } from "@tanstack/solid-router"
import { For } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { demoAdminNavStateCreate } from "../state/demoAdminNavStateCreate.ts"

export function DemoAdminNav(props?: { readonly pathname?: () => string }) {
  let locationPathname = () => ""
  if (props?.pathname) {
    locationPathname = props.pathname
  } else {
    try {
      const location = useLocation()
      locationPathname = () => location().pathname
    } catch {
      // Fallback for isolated component testing
    }
  }

  const state = demoAdminNavStateCreate({ pathname: locationPathname })

  return (
    <nav
      aria-label="Admin-Demo-Navigation"
      class="flex flex-wrap items-center gap-space-2 border-b border-border-subtle pb-space-4"
    >
      <For each={state.items()}>
        {(item) => (
          <Link
            to={item.href}
            aria-current={item.active ? "page" : undefined}
            class="focus-ring flex items-center gap-space-2 rounded-control px-space-3 py-space-2 text-sm font-medium transition-colors"
            classList={{
              "bg-brand-soft font-semibold text-brand-accent": item.active,
              "text-content-muted hover:bg-surface-muted hover:text-content": !item.active,
            }}
          >
            <Icon path={item.icon} class="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )}
      </For>
    </nav>
  )
}
