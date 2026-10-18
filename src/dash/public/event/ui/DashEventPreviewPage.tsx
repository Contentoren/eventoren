import { createSignal, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { UiContainer } from "#src/ui/UiContainer.tsx"
import { EventDetailPageView } from "#src/events/EventDetailPageView.tsx"
import { DashMarkdown } from "#src/dash/ui/markdown/DashMarkdown.tsx"
import { DashOrgLogo } from "#src/dash/ui/org/DashOrgLogo.tsx"
import { DashSocialLinks } from "#src/dash/ui/social/DashSocialLinks.tsx"
import { dashEventToFaqItems, dashEventToScheduleItems } from "#src/dash/public/event/model/dashEventToEventItem.ts"
import type { DashEventPreviewState } from "../model/dashEventPreviewStateCreate.ts"

/** Öffentliche Event-Vorschau aus Dashboard-Daten auf der Produktions-Eventseite. */
export function DashEventPreviewPage(p: { state: DashEventPreviewState }) {
  const state = p.state
  return (
    <Show
      when={state.item()}
      fallback={
        <main id="content" tabindex="-1">
          <UiContainer class="py-space-7">
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
            >
              Dieses Event gibt es hier nicht. Schau dir stattdessen das Veranstalterprofil an.
            </p>
            <div class="mt-space-4">
              <Show
                when={state.org()?.slug}
                fallback={
                  <LinkButtonInternal to="/demo/customer/events" variant="outline" class="h-10 px-4 text-sm">
                    Zurück zum Eventkatalog
                  </LinkButtonInternal>
                }
              >
                {(slug) => (
                  <LinkButtonInternal
                    to="/demo/customer/veranstalter/$orgSlug"
                    params={{ orgSlug: slug() }}
                    variant="outline"
                    class="h-10 px-4 text-sm"
                  >
                    Zum Veranstalterprofil
                  </LinkButtonInternal>
                )}
              </Show>
            </div>
          </UiContainer>
        </main>
      }
    >
      {(item) => (
        <EventDetailPageView
          event={item()}
          state={state}
          description={<DashMarkdown text={state.event()?.description ?? ""} />}
          faqs={dashEventToFaqItems(state.event()?.faq ?? [])}
          schedule={dashEventToScheduleItems(state.event()?.schedule ?? [])}
          notice={
            <Show when={state.isDraft()}>
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-500/50 bg-amber-50 px-4 py-3 text-sm">
                <p class="font-semibold text-amber-900">Vorschau · Entwurf · nur für dich sichtbar</p>
                <Show when={state.event()?.id}>
                  {(eventId) => (
                    <LinkButtonInternal
                      to="/demo/dashboard/events/$eventId"
                      params={{ eventId: eventId() }}
                      variant="outline"
                      class="h-9 px-3 text-sm"
                    >
                      Zum Dashboard
                    </LinkButtonInternal>
                  )}
                </Show>
              </div>
            </Show>
          }
          ticketsFooter={<DashEventPreviewCode state={state} />}
          organizerCard={<DashEventPreviewOrganizer state={state} />}
        />
      )}
    </Show>
  )
}

function DashEventPreviewOrganizer(p: { state: DashEventPreviewState }) {
  const state = p.state
  return (
    <Show when={state.org()}>
      {(org) => (
        <section aria-label="Veranstalter" class="flex flex-col border-t border-border-subtle/40 pt-space-4">
          <div class="flex items-start gap-4">
            <DashOrgLogo name={org().name} logoDataUrl={org().logoDataUrl} size="lg" shape="circle" />
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-semibold text-content">{org().name}</h2>
              <Show when={org().subtitle.trim() !== ""}>
                <p class="mt-0.5 text-sm text-content-muted">{org().subtitle}</p>
              </Show>
              <div class="mt-3">
                <DashSocialLinks socials={org().socials} website={org().website} name={org().name} size="sm" />
              </div>
              <div class="mt-3">
                <LinkButtonInternal
                  to="/demo/customer/veranstalter/$orgSlug"
                  params={{ orgSlug: org().slug }}
                  variant="outline"
                  class="h-9 px-3 text-sm"
                >
                  Profil ansehen
                </LinkButtonInternal>
              </div>
            </div>
          </div>
        </section>
      )}
    </Show>
  )
}

function DashEventPreviewCode(p: { state: DashEventPreviewState }) {
  const state = p.state
  const [expanded, setExpanded] = createSignal(false)
  return (
    <Show
      when={expanded()}
      fallback={
        <Button
          variant="none"
          size="none"
          type="button"
          aria-expanded="false"
          aria-controls="dash-preview-code-panel"
          onClick={() => setExpanded(true)}
          class="focus-ring self-start rounded text-sm font-semibold text-brand-accent transition-colors hover:text-content hover:underline"
        >
          Zugangscode eingeben
        </Button>
      }
    >
      <div
        id="dash-preview-code-panel"
        class="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface-muted/40 p-4"
      >
        <Label for="dash-preview-code">Zugangscode?</Label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <Input
            id="dash-preview-code"
            value={state.codeInput.get()}
            onInput={(event) => state.codeInput.set(event.currentTarget.value)}
            placeholder="Code eingeben"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck={false}
            class="h-10 uppercase"
          />
          <Button variant="outline" class="h-10 shrink-0 px-4 text-sm" onClick={state.redeemCode}>
            Einlösen
          </Button>
        </div>
        <Show when={state.discountHint.get()}>
          {(hint) => (
            <p role="status" class="text-sm text-content-muted">
              {hint()}
            </p>
          )}
        </Show>
        <Show when={state.codeError.get()}>
          {(message) => (
            <p role="alert" class="text-sm text-danger">
              {message()}
            </p>
          )}
        </Show>
      </div>
    </Show>
  )
}
