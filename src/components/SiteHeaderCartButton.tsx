import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { classMerge } from "../ui/classMerge.ts"

export function SiteHeaderCartButton(props: {
  quantity: number
  label: string
  hasItems: boolean
  class?: string
  href?: string
  active?: boolean
}) {
  const content = () => (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
        <path
          d="M4 5h2l1.6 9.2a2 2 0 0 0 2 1.8h6.9a2 2 0 0 0 2-1.7L20 8H7"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="10" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="19.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
      <span class="hidden lg:inline">Warenkorb</span>
      <Show when={props.hasItems}>
        <span
          aria-hidden="true"
          class="absolute -right-space-1 -top-space-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-space-1 text-[0.625rem] font-bold leading-5 text-brand-content"
        >
          {props.quantity}
        </span>
      </Show>
    </>
  )
  const className = classMerge(
    "focus-ring relative inline-flex h-10 items-center gap-2 rounded-control px-space-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted max-md:px-space-2",
    props.active && "bg-surface-muted",
    props.class,
  )

  return props.href ? (
    <a href={props.href} aria-label={props.label} aria-current={props.active ? "page" : undefined} class={className}>
      {content()}
    </a>
  ) : (
    <Link
      to="/warenkorb"
      aria-label={props.label}
      activeProps={{ class: "bg-surface-muted", "aria-current": "page" }}
      class={className}
    >
      {content()}
    </Link>
  )
}
