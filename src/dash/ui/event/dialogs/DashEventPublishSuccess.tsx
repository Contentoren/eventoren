import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Show } from "solid-js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

/** Erfolgsansicht nach dem Veröffentlichen: Link kopieren, Seite ansehen, Zum Event. */
export function DashEventPublishSuccess(p: { eventId: string; link: { path: string; url: string } | null }) {
  const fallbackPath = () => `/demo/dashboard/events/${p.eventId}`
  return (
    <div class="flex flex-col items-center gap-3 py-2 text-center">
      <Icon path={mdiCheckCircleOutline} class="size-12 text-success dark:text-emerald-300" />
      <p class="text-sm text-content-muted">Teile den Link mit deinen Gästen.</p>
      <Show
        when={p.link !== null}
        fallback={<p class="text-sm text-danger dark:text-red-300">Link nicht verfügbar.</p>}
      >
        <div class="flex w-full items-center gap-2 rounded-control border border-border-subtle px-3 py-2">
          <span class="min-w-0 flex-1 truncate text-left text-sm">{p.link?.url ?? ""}</span>
          <CopyButton value={p.link?.url ?? ""} size="sm" ariaLabel="Link kopieren" />
        </div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <LinkButtonInternal
            to={p.link?.path ?? fallbackPath()}
            target="_blank"
            variant="outline"
            icon={mdiOpenInNew}
            iconClass="size-4"
          >
            Seite ansehen
          </LinkButtonInternal>
          <LinkButtonInternal to={p.link?.path ?? fallbackPath()} variant={buttonVariant.contrast}>
            Zum Event
          </LinkButtonInternal>
        </div>
      </Show>
    </div>
  )
}
