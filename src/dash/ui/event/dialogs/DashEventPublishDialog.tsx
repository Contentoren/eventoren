import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiCloseCircleOutline } from "@adaptive-ds/mdi/mdiCloseCircleOutline.js"
import { mdiMinusCircleOutline } from "@adaptive-ds/mdi/mdiMinusCircleOutline.js"
import Dialog from "@corvu/dialog"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { dashEventPublicPath } from "#src/dash/model/dashEventPublicPath.ts"
import { dashEventPublicUrl } from "#src/dash/model/dashEventPublicUrl.ts"
import { type DashEventPublishCheckItem, dashEventPublishCheck } from "#src/dash/model/dashEventPublishCheck.ts"
import { dashEventPublish } from "#src/dash/store/actions/event/dashEventPublish.ts"
import { dashEventByIdIn } from "#src/dash/store/dashEventByIdIn.ts"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashEventPublishSuccess } from "./DashEventPublishSuccess.tsx"
import { dashEventPublishDialogStateCreate } from "./dashEventPublishDialogStateCreate.ts"

export interface DashEventPublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

function dashPublishItemIcon(item: DashEventPublishCheckItem): { path: string; class: string } {
  if (!item.required && !item.done)
    return { path: mdiMinusCircleOutline, class: "text-content-muted dark:text-slate-400" }
  if (item.done) return { path: mdiCheckCircleOutline, class: "text-success dark:text-emerald-300" }
  return { path: mdiCloseCircleOutline, class: "text-danger dark:text-red-300" }
}

/**
 * Dialog „Veröffentlichen“ mit Checkliste (Pflicht grün/rot, optional grau),
 * Erfolgansicht mit Link kopieren, „Seite ansehen“ und „Zum Event“.
 */
export function DashEventPublishDialog(p: DashEventPublishDialogProps) {
  const state = dashEventPublishDialogStateCreate({ open: () => p.open })

  const event = () => dashEventByIdIn(dashStateGet(), p.eventId)
  const check = () => {
    const current = event()
    if (!current) return null
    const store = dashStateGet()
    return dashEventPublishCheck(
      current,
      store.ticketTypes.filter((type) => type.eventId === current.id),
      store.orgs.find((org) => org.id === current.orgId) ?? null,
    )
  }

  const publicPath = () => {
    const current = event()
    if (!current) return null
    const store = dashStateGet()
    const org = store.orgs.find((candidate) => candidate.id === current.orgId)
    if (!org) return null
    return {
      path: dashEventPublicPath(org.slug, current.slug),
      url: dashEventPublicUrl(org.slug, current.slug),
    }
  }

  const submit = () => {
    if (state.pending.get()) return
    state.error.set(null)
    state.pending.set(true)
    const result = dashEventPublish(p.eventId)
    state.pending.set(false)
    if (!result.success) {
      state.error.set(result.errorMessage)
      return
    }
    state.published.set(true)
    toastAdd({ title: "Dein Event ist online", description: "Der Link ist kopierbereit.", variant: "success" })
  }

  const requiredOk = () => {
    const result = check()
    return result !== null && result.items.every((item) => !item.required || item.done)
  }

  return (
    <Dialog
      open={p.open}
      onOpenChange={(open) => {
        state.openReset(open)
        p.onOpenChange(open)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={classesDialogOverlayMerge()} />
        <Dialog.Content class={classesDialogContentMerge("w-[calc(100vw-2rem)] max-w-lg")}>
          <header class="mb-4">
            <Dialog.Label class="text-lg font-semibold">
              {state.published.get() ? "Dein Event ist online" : "Event veröffentlichen"}
            </Dialog.Label>
            <Show when={!state.published.get()}>
              <Dialog.Description class="mt-1 text-sm text-content-muted">
                Prüfe kurz die Setup-Checkliste.
              </Dialog.Description>
            </Show>
          </header>
          <Show
            when={state.published.get() && publicPath() !== null}
            fallback={
              <>
                <ul class="space-y-1.5">
                  <For each={check()?.items ?? []}>
                    {(item) => {
                      const icon = dashPublishItemIcon(item)
                      return (
                        <li
                          class={cn(
                            "flex items-center gap-2 rounded-control px-3 py-2 text-sm",
                            item.done || !item.required ? "bg-surface-muted" : "bg-danger-soft dark:bg-red-950/60",
                          )}
                        >
                          <Icon path={icon.path} class={cn("size-4 shrink-0", icon.class)} />
                          <span class="flex-1">{item.label}</span>
                          <Show when={!item.required && !item.done}>
                            <span class="text-xs text-content-muted">optional</span>
                          </Show>
                        </li>
                      )
                    }}
                  </For>
                </ul>
                <Show when={state.error.get()}>
                  {(message) => (
                    <p role="alert" class="mt-3 text-sm text-danger dark:text-red-300">
                      {message()}
                    </p>
                  )}
                </Show>
                <div class="mt-4 flex items-center justify-end gap-2">
                  <Button variant="outline" class="h-9 px-3 text-sm gap-1.5" onClick={() => p.onOpenChange(false)}>
                    Abbrechen
                  </Button>
                  <Button
                    variant={buttonVariant.contrast}
                    class="h-9 px-3 text-sm gap-1.5"
                    onClick={submit}
                    disabled={!requiredOk() || state.pending.get()}
                    title={requiredOk() ? undefined : "Bitte erfülle zuerst alle Pflichtpunkte"}
                  >
                    <Icon path={mdiCheck} class="size-4" />
                    {state.pending.get() ? "Wird veröffentlicht …" : "Veröffentlichen"}
                  </Button>
                </div>
              </>
            }
          >
            <DashEventPublishSuccess eventId={p.eventId} link={publicPath()} />
          </Show>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
