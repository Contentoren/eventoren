import type { JSX } from "solid-js"
import { UiButton } from "../ui/UiButton.tsx"
import { classMerge } from "../ui/classMerge.ts"

type TicketAppleWalletButtonProps = {
  onClick?: (event: MouseEvent) => void
  disabled?: boolean
  class?: string
  type?: "button" | "submit" | "reset"
  children?: JSX.Element
  "aria-label"?: string
  title?: string
  id?: string
}

export function TicketAppleWalletButton(props: TicketAppleWalletButtonProps) {
  return (
    <UiButton
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      id={props.id}
      aria-label={props["aria-label"] ?? "Zu Apple Wallet hinzufügen"}
      class={classMerge(
        "bg-black text-white hover:bg-neutral-800 active:bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-medium tracking-tight shadow-sm transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        props.class,
      )}
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 fill-current" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.88c.62-.75 1.04-1.8 0.93-2.88-.9.04-1.99.6-2.63 1.35-.56.65-1.06 1.7-0.93 2.73 1 .08 2.01-.45 2.63-1.2z" />
      </svg>
      {props.children ?? <span class="whitespace-nowrap font-medium">Apple Wallet</span>}
    </UiButton>
  )
}
