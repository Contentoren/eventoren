import { For } from "solid-js"
import type { SiteLocale } from "../locale/SiteLocale.ts"
import { classMerge } from "../ui/classMerge.ts"
import { UiPopover } from "../ui/UiPopover.tsx"

export function SiteHeaderLocalePicker(props: {
  open: boolean
  label: string
  locale: SiteLocale
  options: readonly SiteLocale[]
  onToggle: () => void
  onClose: () => void
  onSelect: (locale: SiteLocale) => void
  class?: string
}) {
  return (
    <UiPopover
      open={props.open}
      onClose={() => props.onClose()}
      label="Land, Sprache und Währung wählen"
      trigger={(api) => (
        <button
          type="button"
          onClick={() => props.onToggle()}
          aria-haspopup="dialog"
          aria-expanded={props.open}
          aria-controls={api.panelId}
          aria-label={`Land, Sprache und Währung: ${props.locale.countryLabel}, ${props.locale.languageLabel}, ${props.locale.currencyLabel}`}
          class={classMerge(
            "focus-ring inline-flex h-10 items-center gap-space-2 rounded-control px-space-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted",
            props.class,
          )}
        >
          <span aria-hidden="true" class="text-base leading-none">
            {props.locale.flag}
          </span>
          <span class="hidden md:inline">{props.label}</span>
          <span class="md:hidden">{(props.locale.id.split("-")[1] ?? props.locale.id).toUpperCase()}</span>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            class="size-4 text-content-muted"
            fill="none"
            stroke="currentColor"
          >
            <path d="M6 8l4 4 4-4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      )}
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-content-muted">Land & Währung</p>
      <ul class="mt-space-4 flex flex-col gap-space-1">
        <For each={props.options}>
          {(option) => (
            <li>
              <button
                type="button"
                onClick={() => props.onSelect(option)}
                aria-current={option.id === props.locale.id ? "true" : undefined}
                class={classMerge(
                  "focus-ring flex w-full items-center gap-space-3 rounded-control px-space-3 py-space-2 text-left text-sm transition-colors",
                  option.id === props.locale.id
                    ? "bg-brand-soft font-semibold text-brand-accent"
                    : "text-content hover:bg-surface-muted",
                )}
              >
                <span aria-hidden="true" class="text-base leading-none">
                  {option.flag}
                </span>
                <span class="flex flex-col">
                  <span>{option.countryLabel}</span>
                  <span class="text-xs text-content-muted">
                    {option.languageLabel} · {option.currencyCode}
                  </span>
                </span>
              </button>
            </li>
          )}
        </For>
      </ul>
    </UiPopover>
  )
}
