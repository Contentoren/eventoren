import { type JSX, Show } from "solid-js"
import { classMerge } from "./classMerge.ts"
import { uiDialogStateCreate } from "./uiDialogStateCreate.ts"

const widthClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
} as const

export function UiDialog(props: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  width?: keyof typeof widthClass
  children: JSX.Element
}) {
  const state = uiDialogStateCreate({ open: () => props.open, onClose: () => props.onClose() })

  return (
    <dialog
      ref={state.attachRef}
      aria-labelledby={state.titleId}
      aria-describedby={props.description ? state.descriptionId : undefined}
      onClose={() => state.requestClose()}
      onCancel={(event) => {
        event.preventDefault()
        state.requestClose()
      }}
      onPointerDown={(event) => state.dismissOnBackdrop(event)}
      class={classMerge(
        "m-auto w-[calc(100vw-2rem)] rounded-card border border-border-strong bg-surface p-0 text-content shadow-2xl shadow-black/60 backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        widthClass[props.width ?? "md"],
      )}
    >
      <div class="flex flex-col gap-space-5 p-space-6">
        <div class="flex items-start justify-between gap-space-5">
          <div class="flex flex-col gap-space-1">
            <h2 id={state.titleId} class="text-lg font-semibold tracking-tight text-content">
              {props.title}
            </h2>
            <Show when={props.description}>
              <p id={state.descriptionId} class="text-sm leading-relaxed text-content-muted">
                {props.description}
              </p>
            </Show>
          </div>

          <button
            type="button"
            onClick={() => state.requestClose()}
            aria-label="Dialog schließen"
            class="focus-ring -mr-space-2 -mt-space-2 flex size-9 shrink-0 items-center justify-center rounded-control text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
              <path d="M5 5l10 10M15 5L5 15" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        {props.children}
      </div>
    </dialog>
  )
}
