import type { JSX } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { classMerge } from "../ui/classMerge.ts"

type TicketGoogleWalletButtonProps = {
  onClick?: (event: MouseEvent) => void
  disabled?: boolean
  class?: string
  type?: "button" | "submit" | "reset"
  children?: JSX.Element
  "aria-label"?: string
  title?: string
  id?: string
}

export function TicketGoogleWalletButton(props: TicketGoogleWalletButtonProps) {
  return (
    <UiButton
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      id={props.id}
      aria-label={props["aria-label"] ?? "Zu Google Wallet hinzufügen"}
      class={classMerge(
        "bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium tracking-tight shadow-sm transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        props.class,
      )}
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
        <g transform="translate(-0.417, -0.356)">
          <path
            d="M 2.587 7.673 c 0 -2.094 1.707 -3.792 3.812 -3.792 H 18.436 c 2.105 0 3.812 1.698 3.812 3.792 v 6.938 c 0 2.094 -1.707 3.792 -3.812 3.792 H 6.399 c -2.105 0 -3.812 -1.698 -3.812 -3.792 z"
            fill="#34A853"
          />
          <path
            d="M 2.587 10.208 c 0 -2.137 1.707 -3.87 3.812 -3.87 H 18.436 c 2.105 0 3.812 1.733 3.812 3.87 v 4.325 c 0 2.137 -1.707 3.87 -3.812 3.87 H 6.399 c -2.105 0 -3.812 -1.733 -3.812 -3.87 z"
            fill="#FBBC04"
          />
          <path
            d="M 2.587 12.605 c 0 -2.104 1.709 -3.81 3.816 -3.81 H 18.432 c 2.108 0 3.816 1.706 3.816 3.81 v 1.988 c 0 2.104 -1.708 3.81 -3.816 3.81 H 6.403 c -2.108 0 -3.816 -1.706 -3.816 -3.81 z"
            fill="#EA4335"
          />
          <path
            d="M 2.588 11.039 l 12.454 2.948 c 1.507 0.339 3.089 0.016 4.324 -0.896 l 2.883 -2.173 c 0 1.685 0 4.231 0 6.325 0 1.998 -1.608 3.583 -3.622 3.583 H 6.252 c -2.014 0 -3.664 -1.586 -3.664 -3.584 z"
            fill="#4285F4"
          />
        </g>
      </svg>
      {props.children ?? <span class="whitespace-nowrap font-medium">Google Wallet</span>}
    </UiButton>
  )
}
