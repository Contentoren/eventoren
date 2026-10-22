import { For, Show, useContext } from "solid-js"
import { Link } from "@tanstack/solid-router"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { organizerDashboardInvitationsStateCreate } from "./veranstalterDashboardInvitationsStateCreate.ts"

/**
 * Authenticated invitation inbox of the signed-in account.
 * Accepting is an explicit click: opening the page or the mail link never
 * grants a role on its own.
 */
export function VeranstalterDashboardInvitationsPage(props: {
  readonly selectedInvitationId: () => string | undefined
}) {
  const auth = useContext(eventorenAuthContext)
  const state = organizerDashboardInvitationsStateCreate({
    selectedInvitationId: props.selectedInvitationId,
  })
  return (
    <main class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-semibold text-content">Deine Einladungen</h1>
        <p class="text-sm text-content-muted">
          Einladungen für ein Team werden an die E-Mail-Adresse deines Kontos geschickt. Nur die angemeldete Person kann
          eine Einladung annehmen.
        </p>
      </header>

      <Show when={auth.ready() && auth.identity() === null}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p role="status" class="text-sm text-content-muted">
            Für deine Einladungen musst du angemeldet sein.
          </p>
          <div class="mt-3">
            <Link to="/sign-in" class="text-sm underline">
              Zur Anmeldung
            </Link>
          </div>
        </CardWrapper>
      </Show>

      <Show when={auth.ready() && auth.identity() !== null}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p class="text-sm text-content-muted">
            Konto-E-Mail:{" "}
            <span class="font-medium text-content">{state.accountEmail() ?? "keine E-Mail-Adresse hinterlegt"}</span>
          </p>
        </CardWrapper>
      </Show>

      <Show when={state.error() !== null}>
        <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error()}
        </p>
      </Show>

      <Show when={state.acceptedOrgName() !== null}>
        <p role="status" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          Du bist jetzt Teil des Teams von {state.acceptedOrgName()}.
        </p>
      </Show>

      <Show when={state.listError() !== null}>
        <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.listError()}
        </p>
      </Show>

      <Show when={state.isLoading() && state.invitations().length === 0}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p class="text-sm text-content-muted">Wird geladen …</p>
        </CardWrapper>
      </Show>

      <Show when={state.isEmpty()}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p class="text-sm text-content-muted">Für dein Konto liegen keine offenen Einladungen vor.</p>
        </CardWrapper>
      </Show>

      <ul class="flex flex-col gap-3">
        <For each={state.invitations()}>
          {(invitation) => (
            <li>
              <CardWrapper
                class={
                  state.selectedInvitationId() === invitation.id
                    ? "border-primary ring-1 ring-primary"
                    : "rounded-card border-border-subtle shadow-none"
                }
              >
                <div class="flex flex-col gap-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="text-lg font-semibold text-content">{invitation.orgName}</h2>
                    <Badge>{state.statusLabel(invitation.status)}</Badge>
                    <Badge>{state.roleLabel(invitation.organizerRole)}</Badge>
                  </div>
                  <p class="text-sm text-content-muted">
                    E-Mail: {invitation.invitedEmail} · Gültig bis {state.expiresAtLabel(invitation.expiresAt)}
                  </p>
                  <Show when={invitation.status === "pending"}>
                    <div>
                      <Button
                        type="button"
                        variant="contrast"
                        disabled={state.accepting()}
                        onClick={() => void state.acceptInvitation(invitation.id)}
                      >
                        {state.accepting() ? "Wird angenommen …" : "Einladung annehmen"}
                      </Button>
                    </div>
                  </Show>
                  <Show when={invitation.status === "expired"}>
                    <p class="text-sm text-content-muted">Diese Einladung ist abgelaufen. Bitte bitte um eine neue.</p>
                  </Show>
                  <Show when={invitation.status === "revoked"}>
                    <p class="text-sm text-content-muted">Diese Einladung wurde widerrufen.</p>
                  </Show>
                  <Show when={invitation.status === "accepted"}>
                    <p class="text-sm text-content-muted">Diese Einladung wurde bereits angenommen.</p>
                  </Show>
                </div>
              </CardWrapper>
            </li>
          )}
        </For>
      </ul>

      <Show when={!state.isDone()}>
        <div>
          <Button type="button" variant="outline" disabled={state.isLoading()} onClick={() => state.loadMore()}>
            Weitere Einladungen laden
          </Button>
        </div>
      </Show>
    </main>
  )
}
