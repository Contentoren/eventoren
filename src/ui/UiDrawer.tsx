import { type JSX, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { classMerge } from "./classMerge.ts"
import { uiDrawerStateCreate } from "./uiDrawerStateCreate.ts"

const widthClass = {
  xs: "w-[85vw] max-w-xs",
  sm: "w-[85vw] max-w-sm",
  md: "w-[85vw] max-w-md",
} as const

export function UiDrawer(props: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  width?: keyof typeof widthClass
  class?: string
  children: JSX.Element
}) {
  const state = uiDrawerStateCreate({
    open: () => props.open,
    onClose: () => props.onClose(),
  })

  return (
    <Show when={state.isMounted()}>
      <Portal>
        <div class="fixed inset-0 z-50 pointer-events-none md:hidden">
          <div
            onClick={state.handleBackdropClick}
            aria-hidden="true"
            class={classMerge(
              "fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-out",
              state.isVisible() ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            )}
          />

          <aside
            ref={state.attachPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={state.titleId}
            aria-describedby={props.description ? state.descriptionId : undefined}
            tabIndex={-1}
            class={classMerge(
              "fixed inset-y-0 right-0 z-50 flex h-full flex-col border-l border-border-subtle bg-surface text-content shadow-2xl transition-transform duration-300 ease-out",
              widthClass[props.width ?? "xs"],
              state.isVisible() ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none",
              props.class,
            )}
          >
            <div class="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle px-space-5">
              <div class="flex flex-col gap-space-1">
                <h2 id={state.titleId} class="text-base font-semibold tracking-tight text-content">
                  {props.title}
                </h2>
                <Show when={props.description}>
                  <p id={state.descriptionId} class="text-xs text-content-muted">
                    {props.description}
                  </p>
                </Show>
              </div>

              <Button
                variant="none"
                size="none"
                ref={state.attachCloseButtonRef}
                type="button"
                onClick={() => state.requestClose()}
                aria-label="Menü schließen"
                class="focus-ring -mr-space-2 flex size-11 items-center justify-center rounded-control text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" class="size-6" fill="none" stroke="currentColor">
                  <path d="M6 6l12 12M18 6L6 18" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </Button>
            </div>

            <div class="flex flex-1 flex-col overflow-y-auto p-space-5">{props.children}</div>
          </aside>
        </div>
      </Portal>
    </Show>
  )
}
