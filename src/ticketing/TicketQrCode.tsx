import { Show } from "solid-js"
import { classMerge } from "../ui/classMerge.ts"
import { ticketQrCodeStateCreate } from "./ticketQrCodeStateCreate.ts"

export function TicketQrCode(props: { value: string; label: string; class?: string }) {
  const state = ticketQrCodeStateCreate({ value: () => props.value })

  return (
    <figure class={classMerge("flex flex-col items-center gap-space-3", props.class)}>
      <Show
        when={state.svgMarkup()}
        fallback={
          <p role="alert" class="text-sm text-danger">
            {state.errorMessage()}
          </p>
        }
      >
        <div
          role="img"
          aria-label={props.label}
          /* Stays white on purpose: scanners need light modules + quiet zone. */
          class="size-44 rounded-control bg-white p-space-2 ring-2 ring-white/80"
          innerHTML={state.svgMarkup()}
        />
      </Show>
      <figcaption class="font-mono text-sm font-medium tracking-widest text-content">{props.value}</figcaption>
    </figure>
  )
}
