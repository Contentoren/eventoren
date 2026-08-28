import type { JSX } from "solid-js"
import { uiPopoverStateCreate } from "./uiPopoverStateCreate.ts"

export function UiPopover(props: {
  open: boolean
  onClose: () => void
  label: string
  trigger: (api: { panelId: string; open: boolean }) => JSX.Element
  children: JSX.Element
  align?: "start" | "end"
  class?: string
}) {
  const state = uiPopoverStateCreate({ open: () => props.open, onClose: () => props.onClose() })

  return (
    <div ref={state.attachRef} class={`relative ${props.class ?? ""}`}>
      {props.trigger({ panelId: state.panelId, open: props.open })}

      <div
        id={state.panelId}
        role="dialog"
        aria-label={props.label}
        hidden={!props.open}
        class={`absolute top-[calc(100%+0.5rem)] z-40 w-72 rounded-card border border-border-strong bg-surface p-space-5 text-content shadow-2xl shadow-black/60 ${
          props.align === "start" ? "left-0" : "right-0"
        }`}
      >
        {props.children}
      </div>
    </div>
  )
}
