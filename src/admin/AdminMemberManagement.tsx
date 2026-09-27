import { mdiMinus } from "@adaptive-ds/mdi/mdiMinus.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CheckSingle } from "#ui/input/check/CheckSingle.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import type { AdminMemberManagementState } from "./AdminMemberManagementState.ts"

export function AdminMemberManagement(props: { readonly state: AdminMemberManagementState }) {
  const state = props.state
  const viewPreference = adminListViewPreferenceContextUse()

  const memberDetails = (member: ReturnType<typeof state.members>[number]) => (
    <>
      <div class="min-w-0">
        <p class="truncate font-semibold text-content">{member.displayName || member.userName}</p>
        <p class="truncate text-sm text-content-muted">
          {member.email ?? member.preferredLoginName ?? member.userName}
        </p>
      </div>
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">{state.text().role}</p>
        <div class="flex flex-wrap gap-2">
          <For each={member.zitadelRoles}>
            {(role) => <Badge variant="subtle">{state.text().roleName(role)}</Badge>}
          </For>
        </div>
      </div>
      <ButtonIcon
        class="w-full lg:w-auto"
        variant="contrast"
        icon={member.organizerGranted ? mdiMinus : mdiPlus}
        disabled={state.isUpdating(member.zitadelUserId)}
        aria-label={`${member.organizerGranted ? state.text().revoke : state.text().grant}: ${member.displayName || member.userName}`}
        onClick={() => void state.roleChange(member)}
      >
        {state.isUpdating(member.zitadelUserId)
          ? state.text().updating
          : member.organizerGranted
            ? state.text().revoke
            : state.text().grant}
      </ButtonIcon>
    </>
  )

  return (
    <section aria-labelledby="admin-member-management-title" class="flex flex-col gap-5">
      <Dynamic
        component={viewPreference?.view() === "tiles" ? CardWrapper : "div"}
        class="[.admin-workspace_&]:rounded-xl [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface [.admin-workspace_&]:p-5 [.admin-workspace_&]:shadow-md [.admin-workspace_&]:shadow-slate-900/10 dark:[.admin-workspace_&]:shadow-black/25"
      >
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
                class="mt-2 [.admin-workspace_&]:min-h-11 [.admin-workspace_&]:rounded-lg [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/60 dark:[.admin-workspace_&]:bg-slate-800/60"
                placeholder={state.text().searchHint}
                value={state.search()}
                onInput={(event) => state.searchChange(event.currentTarget.value)}
              />
            </div>
            <Button type="submit" disabled={state.isLoading()}>
              {state.text().searchSubmit}
            </Button>
            <fieldset>
              <legend class="sr-only">Rollen filtern</legend>
              <CheckSingle
                id="admin-member-role-filter"
                class="sm:pb-2 [.admin-workspace_&]:rounded-lg [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/60 dark:[.admin-workspace_&]:bg-slate-800/60"
                valueSignal={state.roleFilter}
                getOptions={() => ["all", "admin", "organizer"]}
                valueText={(role) =>
                  role === "all" ? "Alle" : role === "organizer" ? "Veranstalter" : state.text().roleName(role)
                }
                disallowDeselection
              />
            </fieldset>
          </form>

          <Show when={state.errorMessage()}>
            <div class="flex flex-wrap items-center gap-3">
              <p
                role="alert"
                class="flex-1 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200 [.admin-workspace_&]:border-0"
              >
                {state.errorMessage()}
              </p>
              <Button
                size="sm"
                variant="outline"
                class="[.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/60 dark:[.admin-workspace_&]:bg-slate-800/60"
                onClick={() => void state.reload()}
              >
                {state.text().reload}
              </Button>
            </div>
          </Show>
          <Show when={state.successMessage()}>
            <p
              role="status"
              class="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200 [.admin-workspace_&]:border-0"
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
              <ul
                class={
                  viewPreference?.view() === "tiles"
                    ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col divide-y divide-border [.admin-workspace_&]:divide-y-0"
                }
                aria-label={state.text().title}
              >
                <For each={state.members()}>
                  {(member) => (
                    <li
                      class={
                        viewPreference?.view() === "tiles"
                          ? ""
                          : "[.admin-workspace_&]:even:bg-surface-muted/50 dark:[.admin-workspace_&]:even:bg-slate-800/40"
                      }
                    >
                      <Show
                        when={viewPreference?.view() === "tiles"}
                        fallback={
                          <div class="grid gap-4 py-4 [.admin-workspace_&]:rounded-lg [.admin-workspace_&]:px-4 sm:py-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.8fr)_auto] lg:items-center">
                            {memberDetails(member)}
                          </div>
                        }
                      >
                        <CardWrapper class="flex h-full flex-col justify-between gap-5 border-2 border-border-strong bg-surface shadow-sm [.admin-workspace_&]:rounded-xl [.admin-workspace_&]:border-0 [.admin-workspace_&]:shadow-md [.admin-workspace_&]:shadow-slate-900/10 dark:[.admin-workspace_&]:shadow-black/25">
                          {memberDetails(member)}
                        </CardWrapper>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>
      </Dynamic>
    </section>
  )
}
