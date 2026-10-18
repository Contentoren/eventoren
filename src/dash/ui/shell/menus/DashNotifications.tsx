import { mdiBellOutline } from "@adaptive-ds/mdi/mdiBellOutline.js"
import Popover from "@corvu/popover"
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Show } from "solid-js"
import { dashActiveOrg } from "#src/dash/store/dashActiveOrg.ts"
import { dashNow } from "#src/dash/store/dashNow.ts"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { DashRelativeTime } from "#src/dash/ui/time/DashRelativeTime.tsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classesPopoverContentMerge } from "#ui/interactive/popover/classesPopoverContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashNotificationsCreate } from "./dashNotificationsCreate.ts"
import { dashNotificationsPanelStateCreate } from "./dashNotificationsPanelStateCreate.ts"

const dashNotificationToneIconBg: Record<string, string> = {
  brand: "bg-brand-soft text-brand-strong dark:bg-teal-950/60 dark:text-teal-300",
  warning: "bg-warning-soft text-warning dark:bg-amber-950/60 dark:text-amber-300",
  danger: "bg-danger-soft text-danger dark:bg-red-950/60 dark:text-red-300",
  neutral: "bg-surface-muted text-content-muted",
}

/** Glocke in der Topbar mit abgeleiteten Demo-Hinweisen (Session-Status "gelesen"). */
export function DashNotifications() {
  const state = dashNotificationsPanelStateCreate()
  const openSignal = createSignalObject(false)
  const notifications = createMemo(() => {
    const org = dashActiveOrg()
    if (!org) return []
    const read = new Set(state.readIds.get())
    return dashNotificationsCreate(dashStateGet(), org.id, dashNow()()).filter((entry) => !read.has(entry.id))
  })
  return (
    <Popover open={openSignal.get()} onOpenChange={(next) => openSignal.set(next)}>
      <Popover.Trigger
        type="button"
        class="relative inline-flex rounded-full p-2.5 text-content transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Benachrichtigungen"
        title="Benachrichtigungen"
      >
        <Icon path={mdiBellOutline} class="size-5" />
        <Show when={notifications().length > 0}>
          <span
            class="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger dark:bg-red-400"
            aria-label={`${notifications().length} ungelesen`}
          />
        </Show>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class={classesPopoverContentMerge("w-80 p-1.5")} aria-label="Benachrichtigungen">
          <p class="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-content-muted">Benachrichtigungen</p>
          <Show
            when={notifications().length > 0}
            fallback={<p class="px-2.5 py-4 text-center text-sm text-content-muted">Alles gelesen.</p>}
          >
            <ul class="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
              <For each={notifications()}>
                {(entry) => (
                  <li>
                    <Link
                      to={entry.href}
                      onClick={() => openSignal.set(false)}
                      class="flex items-start gap-2.5 rounded-control px-2.5 py-2 text-sm transition-colors hover:bg-surface-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span
                        class={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${dashNotificationToneIconBg[entry.tone] ?? dashNotificationToneIconBg.neutral}`}
                      >
                        <Icon path={entry.icon} class="size-4" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm text-content">{entry.text}</span>
                        <DashRelativeTime iso={entry.at} class="mt-0.5 block text-xs text-content-muted" />
                      </span>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
            <div class="border-t border-border-subtle p-1.5">
              <Button
                variant={buttonVariant.ghost}
                class="h-8 w-full px-2.5 text-xs"
                onClick={() => state.markAllRead(notifications().map((entry) => entry.id))}
              >
                Alle als gelesen markieren
              </Button>
            </div>
          </Show>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
