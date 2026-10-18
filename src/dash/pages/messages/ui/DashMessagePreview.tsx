import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { DashMarkdown } from "../../../ui/markdown/DashMarkdown.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashMessageRender } from "../model/dashMessageRender.ts"

/** E-Mail-Vorschau: Org-Kopf, Betreff, Hallo {Vorname}, Event-Datum. */
export function DashMessagePreview(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: DashEvent
  org: DashOrg
  subject: string
  body: string
}) {
  const venue = () => `${p.event.venue.name}, ${p.event.venue.city}`
  const rendered = (placeholder: string) =>
    dashMessageRender(p.body, {
      vorname: placeholder,
      event: p.event.title,
      datum: dashDateFormat(p.event.startsAt, "datum"),
    })
  const footer = (extra: JSX.Element): JSX.Element => (
    <div class="flex w-full justify-end gap-2">
      {extra}
      <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={() => p.onOpenChange(false)}>
        Schließen
      </Button>
    </div>
  )
  return (
    <Sheet
      open={p.open}
      onOpenChange={p.onOpenChange}
      title="E-Mail-Vorschau"
      description="So sieht es deine Gästin."
      footer={footer(<span />)}
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3 border-b border-border-subtle pb-3">
          <DashOrgLogo name={p.org.name} logoDataUrl={p.org.logoDataUrl} size="md" />
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-content">{p.org.name}</p>
            <p class="truncate text-xs text-content-muted">
              {venue()} · {dashDateFormat(p.event.startsAt, "kurz")}
            </p>
          </div>
        </div>
        <p class="text-base font-semibold text-content">{p.subject}</p>
        <div class="rounded-card border border-border-subtle bg-surface-muted/40 p-4 text-sm text-content">
          <p class="mb-2">Hallo {p.org.name === "" ? "Gast" : "Lea"},</p>
          <DashMarkdown text={rendered("Lea")} />
        </div>
        <Show when={p.event.venue.street !== ""}>
          <p class="text-xs text-content-muted">
            {p.event.venue.name} · {p.event.venue.street}, {p.event.venue.zip} {p.event.venue.city}
          </p>
        </Show>
        <p class="flex items-center gap-2 text-xs text-content-muted">
          <Icon path={mdiEmailOutline} class="size-4" />
          Dein Ticket findest du im Anhang der E-Mail.
        </p>
      </div>
    </Sheet>
  )
}
