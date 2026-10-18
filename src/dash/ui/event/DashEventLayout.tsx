import { mdiCancel } from "@adaptive-ds/mdi/mdiCancel.js"
import { mdiCalendarRemoveOutline } from "@adaptive-ds/mdi/mdiCalendarRemoveOutline.js"
import { mdiPauseCircleOutline } from "@adaptive-ds/mdi/mdiPauseCircleOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { Outlet } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { classMerge } from "#ui/utils/classMerge.js"
import { dashEventLayoutStateCreate } from "./dashEventLayoutStateCreate.ts"
import { DashEventDialogsHost } from "./dialogs/DashEventDialogsHost.tsx"

export interface DashEventLayoutProps {
  eventId: string
}

const bannerTones: Record<string, string> = {
  draft:
    "border-amber-600/30 bg-warning-soft text-warning dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300",
  cancelled: "border-red-600/30 bg-danger-soft text-danger dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300",
  paused:
    "border-border-subtle bg-surface-muted text-content-muted dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
}

const bannerIcons: Record<string, string> = {
  draft: mdiPencilOutline,
  cancelled: mdiCancel,
  paused: mdiPauseCircleOutline,
}

/** Event-Rahmen mit Status-Banner und „nicht gefunden“-Zustand für alle Event-Unterseiten. */
export function DashEventLayout(p: DashEventLayoutProps) {
  const state = dashEventLayoutStateCreate({ eventId: () => p.eventId })
  return (
    <Show
      when={state.known()}
      fallback={
        <div class="rounded-card border border-border-subtle bg-surface">
          <EmptyState
            icon={mdiCalendarRemoveOutline}
            title="Event nicht gefunden"
            description="Vielleicht wurde es gelöscht oder gehört zu einer anderen Organisation."
            actions={
              <LinkButtonInternal to="/demo/dashboard/events" variant={buttonVariant.outline} class="h-9 px-3 text-sm">
                Zu den Events
              </LinkButtonInternal>
            }
          />
        </div>
      }
    >
      <Show when={state.banner()}>
        {(banner) => (
          <div
            role="status"
            class={classMerge(
              "mb-6 flex items-center gap-2 rounded-control border px-3 py-2 text-sm",
              bannerTones[banner().tone],
            )}
          >
            <Icon path={bannerIcons[banner().tone] ?? mdiPencilOutline} class="size-4 shrink-0" />
            <span class="min-w-0 flex-1 truncate">{banner().text}</span>
            <Show when={banner().tone === "draft"}>
              <Button
                type="button"
                variant={buttonVariant.link}
                class="h-auto shrink-0 px-0 text-sm font-medium"
                onClick={state.openPublish}
              >
                Veröffentlichen
              </Button>
            </Show>
            <Show when={banner().tone === "paused"}>
              <Button
                type="button"
                variant={buttonVariant.link}
                class="h-auto shrink-0 px-0 text-sm font-medium"
                onClick={state.resumeSales}
              >
                Fortsetzen
              </Button>
            </Show>
          </div>
        )}
      </Show>
      <Outlet />
      <DashEventDialogsHost eventId={p.eventId} />
    </Show>
  )
}
