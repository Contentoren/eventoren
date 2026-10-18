import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashStatusPill } from "../status/DashStatusPill.tsx"
import { dashEventHeaderStateCreate } from "./dashEventHeaderStateCreate.ts"

export interface DashEventHeaderProps {
  eventId: string
}

/** Event-Kopf nur auf der Event-Übersicht: Bild, Titel, Meta, Pills und Aktionen. */
export function DashEventHeader(p: DashEventHeaderProps) {
  const state = dashEventHeaderStateCreate({ eventId: () => p.eventId })
  return (
    <Show when={state.event()}>
      {(event) => (
        <section aria-label={event().title} class="mb-6 flex flex-col gap-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Show when={event().imageUrl}>
              <img
                src={event().imageUrl}
                alt={event().imageAlt || ""}
                class="h-16 w-24 shrink-0 rounded-lg object-cover sm:h-20 sm:w-30"
                loading="lazy"
              />
            </Show>
            <div class="min-w-0 flex-1">
              <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">{event().title}</h1>
              <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-content-muted">
                <span class="inline-flex items-center gap-1">
                  <Icon path={mdiCalendarOutline} class="size-4 shrink-0" />
                  {state.dateLine()}
                </span>
                <span class="inline-flex items-center gap-1">
                  <Icon path={mdiMapMarkerOutline} class="size-4 shrink-0" />
                  {state.venueLine()}
                </span>
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <Show when={state.phase()}>{(phase) => <DashStatusPill kind="event" value={phase()} />}</Show>
                <DashStatusPill kind="visibility" value={event().visibility} />
              </div>
            </div>
          </div>
          <Show when={state.canEdit()}>
            <div class="flex flex-wrap items-center gap-2">
              <Show when={state.publicPath()}>
                {(path) => (
                  <LinkButtonInternal
                    to={path()}
                    newTab
                    variant={buttonVariant.outline}
                    class="h-9 gap-1.5 px-3 text-sm"
                    icon={mdiOpenInNew}
                    iconClass="size-4"
                  >
                    Ansehen
                  </LinkButtonInternal>
                )}
              </Show>
              <Show when={state.publicUrl()}>
                {(url) => <CopyButton value={url()} ariaLabel="Öffentlichen Link kopieren" />}
              </Show>
              <Show when={state.primaryAction()}>
                {(action) => (
                  <Show
                    when={action().kind !== "entry"}
                    fallback={
                      <Show when={action().to}>
                        {(to) => (
                          <LinkButtonInternal
                            to={to()}
                            variant={buttonVariant.contrast}
                            class="h-9 gap-1.5 px-3 text-sm"
                            iconClass="size-4"
                          >
                            {action().label}
                          </LinkButtonInternal>
                        )}
                      </Show>
                    }
                  >
                    <Button
                      type="button"
                      variant={buttonVariant.contrast}
                      class="h-9 gap-1.5 px-3 text-sm"
                      onClick={state.primarySelect}
                    >
                      {action().label}
                    </Button>
                  </Show>
                )}
              </Show>
              <DropdownMenu
                items={state.menuItems()}
                triggerIcon={mdiDotsHorizontal}
                triggerAriaLabel="Weitere Aktionen"
              />
            </div>
          </Show>
        </section>
      )}
    </Show>
  )
}
