import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"

export function AdminMemberManagement(props: { readonly state: AdminMemberManagementState }) {
  const state = props.state

  return (
    <section aria-labelledby="admin-member-management-title" class="flex flex-col gap-5">
      <CardWrapper>
        <div class="flex flex-col gap-5">
          <div>
            <h2 id="admin-member-management-title" class="text-xl font-semibold text-content">
              {state.text().title}
            </h2>
            <p class="mt-2 max-w-3xl text-sm leading-relaxed text-content-muted">{state.text().description}</p>
          </div>

          <form
            class="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              void state.searchSubmit()
            }}
          >
            <div class="min-w-0 flex-1">
              <Label for="admin-member-search">{state.text().search}</Label>
              <Input
                id="admin-member-search"
                class="mt-2"
                placeholder={state.text().searchHint}
                value={state.search()}
                onInput={(event) => state.searchChange(event.currentTarget.value)}
              />
            </div>
            <Button type="submit" disabled={state.isLoading()}>
              {state.text().searchSubmit}
            </Button>
          </form>

          <Show when={state.errorMessage()}>
            <div class="flex flex-wrap items-center gap-3">
              <p
                role="alert"
                class="flex-1 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
              >
                {state.errorMessage()}
              </p>
              <Button size="sm" variant="outline" onClick={() => void state.reload()}>
                {state.text().reload}
              </Button>
            </div>
          </Show>
          <Show when={state.successMessage()}>
            <p
              role="status"
              class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200"
            >
              {state.successMessage()}
            </p>
          </Show>

          <Show
            when={state.hasLoaded()}
            fallback={
              <Show when={!state.errorMessage()}>
                <p role="status" class="py-6 text-center text-sm text-content-muted">
                  {state.text().loading}
                </p>
              </Show>
            }
          >
            <div class="flex items-center justify-between gap-3 text-sm text-content-muted">
              <span>{state.text().total.replace("[X]", String(state.total()))}</span>
              <Show when={state.isLoading()}>
                <span class="text-xs">{state.text().loading}</span>
              </Show>
            </div>
            <Show
              when={state.members().length > 0}
              fallback={<p class="py-6 text-center text-sm text-content-muted">{state.text().empty}</p>}
            >
              <ul class="flex flex-col divide-y divide-border" aria-label={state.text().title}>
                <For each={state.members()}>
                  {(member) => (
                    <li class="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.8fr)_minmax(11rem,0.8fr)_auto] lg:items-center">
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-content">{member.displayName || member.userName}</p>
                        <p class="truncate text-sm text-content-muted">
                          {member.email ?? member.preferredLoginName ?? member.userName}
                        </p>
                      </div>
                      <div>
                        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().role}
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <For each={member.zitadelRoles}>
                            {(role) => <Badge variant="subtle">{state.text().roleName(role)}</Badge>}
                          </For>
                        </div>
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-content-muted">
                          {state.text().invitation}
                        </p>
                        <p class="mt-2 text-sm text-content">{state.invitationFormat(member.organizerInvitedAt)}</p>
                      </div>
                      <Button
                        class="w-full lg:w-auto"
                        variant={member.organizerGranted ? "outline" : undefined}
                        disabled={state.isUpdating(member.zitadelUserId)}
                        aria-label={`${member.organizerGranted ? state.text().revoke : state.text().grant}: ${member.displayName || member.userName}`}
                        onClick={() => void state.roleChange(member)}
                      >
                        {state.isUpdating(member.zitadelUserId)
                          ? state.text().updating
                          : member.organizerGranted
                            ? state.text().revoke
                            : state.text().grant}
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>
      </CardWrapper>
    </section>
  )
}
