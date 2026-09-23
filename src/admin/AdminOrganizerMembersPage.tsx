import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { AdminOrganizerMembersPageState } from "./AdminOrganizerMembersPageState.ts"
import { adminOrganizerMembersPageStateCreate } from "./adminOrganizerMembersPageStateCreate.ts"

export function AdminOrganizerMembersPage(props?: {
  readonly state?: AdminOrganizerMembersPageState
  readonly list?: NonNullable<Parameters<typeof adminOrganizerMembersPageStateCreate>[0]>["list"]
  readonly headerSlot?: JSX.Element
}) {
  const state = props?.state ?? adminOrganizerMembersPageStateCreate({ list: props?.list })

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-8 py-10">
        {props?.headerSlot}
        <header class="flex flex-col gap-3">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Veranstalter</h1>
          <p class="max-w-3xl text-sm leading-relaxed text-content-muted">
            Mitglieder mit einer aktiven Veranstalterrolle.
          </p>
        </header>

        <Show when={state.errorMessage()}>
          <div class="flex flex-wrap items-center gap-3">
            <p
              role="alert"
              class="flex-1 rounded-md border border-danger/50 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {state.errorMessage()}
            </p>
            <Button size="sm" variant="outline" onClick={() => void state.reload()}>
              Erneut versuchen
            </Button>
          </div>
        </Show>

        <Show
          when={state.hasLoaded()}
          fallback={
            <Show when={!state.errorMessage()}>
              <CardWrapper>
                <p role="status" class="text-sm text-content-muted">
                  Veranstalter werden geladen …
                </p>
              </CardWrapper>
            </Show>
          }
        >
          <Show
            when={state.members().length > 0}
            fallback={
              <CardWrapper>
                <div class="flex items-center justify-between gap-3 text-sm text-content-muted">
                  <p>Es wurden keine Mitglieder mit aktiver Veranstalterrolle gefunden.</p>
                  <Show when={state.isLoading()}>
                    <span class="text-xs">Veranstalter werden geladen …</span>
                  </Show>
                </div>
              </CardWrapper>
            }
          >
            <CardWrapper class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-3 text-sm text-content-muted">
                <p>{state.members().length} Veranstalter</p>
                <Show when={state.isLoading()}>
                  <span class="text-xs">Veranstalter werden geladen …</span>
                </Show>
              </div>
              <ul class="flex flex-col divide-y divide-border" aria-label="Veranstalter">
                <For each={state.members()}>
                  {(member) => (
                    <li class="grid gap-4 py-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.8fr)_auto] sm:items-center">
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-content">{member.displayName || member.userName}</p>
                        <p class="truncate text-sm text-content-muted">{state.contact(member)}</p>
                      </div>
                      <div>
                        <Badge variant="subtle">Veranstalter</Badge>
                      </div>
                      <div class="text-sm sm:text-right">
                        <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">Eingeladen</p>
                        <p class="mt-1 text-content">{state.invitationFormat(member.organizerInvitedAt)}</p>
                      </div>
                    </li>
                  )}
                </For>
              </ul>
            </CardWrapper>
          </Show>
        </Show>
      </UiContainer>
    </main>
  )
}
