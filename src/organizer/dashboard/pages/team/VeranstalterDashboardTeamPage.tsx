import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { VeranstalterDashboardTeamState } from "./veranstalterDashboardTeamStateCreate.ts"

const teamRoleOptions = ["inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const
const roleSelectionOptions = ["", "inhaber", "admin", "eventmanager", "finanzen", "einlass"] as const

/**
 * Team management of the active organization.
 *
 * The lists are live, the dialogs are driven by the URL, and the delivery
 * state of an invitation is shown as it is stored: a mail that was not handed
 * over to a provider is never presented as sent.
 */
export function VeranstalterDashboardTeamPage(props: { readonly state: VeranstalterDashboardTeamState }) {
  const state = props.state
  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-content">Team</h1>
          <p class="mt-1 text-sm text-content-muted">
            Mitglieder und offene Einladungen deiner Organisation. Die Mitgliedschaft in der Organisation bleibt
            bestehen, wenn jemand aus dem Team entfernt wird.
          </p>
        </div>
        <Show when={state.canManage()}>
          <Button type="button" variant="contrast" onClick={() => state.openInviteDialog()}>
            Einladen
          </Button>
        </Show>
      </div>

      <Show when={!state.canManage()}>
        <p role="note" class="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          Für das Team fehlen dir die Rechte. Eine inhabende oder admin-Rolle verwaltet das Team.
        </p>
      </Show>

      <Show when={state.message() !== null}>
        <p role="status" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          {state.message()}
        </p>
      </Show>

      <Show when={state.error() !== null}>
        <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {state.error()}
        </p>
      </Show>

      <CardWrapper>
        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-content">Teammitglieder</h2>
          <Show when={state.memberListError() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.memberListError()}
            </p>
          </Show>
          <Show when={state.membersLoading() && state.members().length === 0}>
            <p class="text-sm text-content-muted">Wird geladen …</p>
          </Show>
          <Show when={state.canManage() && state.isMembersEmpty()}>
            <p class="text-sm text-content-muted">Diese Organisation hat noch keine Mitglieder.</p>
          </Show>
          <ul class="flex flex-col gap-3">
            <For each={state.members()}>
              {(member) => (
                <li class="flex flex-col gap-2 border-b border-border-subtle pb-3 last:border-b-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium text-content">{member.name}</span>
                    <Show when={member.organizerRole} fallback={<Badge>ohne Teamrolle</Badge>}>
                      {(role) => <Badge>{state.roleLabel(role())}</Badge>}
                    </Show>
                    <Badge>{state.membershipRoleLabel(member.role)}</Badge>
                  </div>
                  <p class="text-sm text-content-muted">
                    {member.email ?? "keine E-Mail-Adresse am Konto"} · Mitglied seit{" "}
                    {state.berlinLabel(member.createdAt)}
                  </p>
                  <Show when={state.canManage()}>
                    <div class="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => state.openRoleDialog(member.id)}>
                        Rolle ändern
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => state.openRemoveDialog(member.id)}
                      >
                        Aus Team entfernen
                      </Button>
                    </div>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Show when={!state.membersDone()}>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.membersLoading()}
                onClick={() => state.loadMoreMembers()}
              >
                Weitere Mitglieder laden
              </Button>
            </div>
          </Show>
        </div>
      </CardWrapper>

      <CardWrapper>
        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-content">Offene Einladungen</h2>
          <Show when={state.invitationListError() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.invitationListError()}
            </p>
          </Show>
          <Show when={state.canManage() && state.isInvitationsEmpty()}>
            <p class="text-sm text-content-muted">Es liegen keine offenen Einladungen vor.</p>
          </Show>
          <ul class="flex flex-col gap-3">
            <For each={state.invitations()}>
              {(invitation) => (
                <li class="flex flex-col gap-2 border-b border-border-subtle pb-3 last:border-b-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium text-content">{invitation.invitedEmail}</span>
                    <Badge>{state.roleLabel(invitation.organizerRole)}</Badge>
                    <Badge>{state.statusLabel(invitation.status)}</Badge>
                    <Badge>{state.deliveryStateLabel(invitation.deliveryState)}</Badge>
                  </div>
                  <p class="text-sm text-content-muted">
                    Gültig bis {state.berlinLabel(invitation.expiresAt)} · Zustellversuche {invitation.deliveryAttempts}
                  </p>
                  <Show when={invitation.deliveryReason !== null}>
                    {(reason) => <p class="text-sm text-content-muted">Grund: {reason()}</p>}
                  </Show>
                  <Show when={state.canManage()}>
                    <div class="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={state.submitting()}
                        onClick={() => void state.resendInvitation(invitation.id)}
                      >
                        Erneut senden
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={state.submitting()}
                        onClick={() => void state.revokeInvitation(invitation.id)}
                      >
                        Widerrufen
                      </Button>
                    </div>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Show when={!state.invitationsDone()}>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={state.invitationsLoading()}
                onClick={() => state.loadMoreInvitations()}
              >
                Weitere Einladungen laden
              </Button>
            </div>
          </Show>
        </div>
      </CardWrapper>

      <ModalDialog
        open={state.dialog() === "einladen"}
        onOpenChange={(open) => {
          if (!open) state.closeDialog()
        }}
        title="Teammitglied einladen"
        description="Die Einladung wird an die angegebene E-Mail-Adresse gesendet und läuft nach 14 Tagen ab."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => state.closeDialog()}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="contrast"
              disabled={state.submitting()}
              onClick={() => void state.submitInvite()}
            >
              {state.submitting() ? "Wird gesendet …" : "Einladung anlegen"}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <Label for="team-invite-email">E-Mail-Adresse</Label>
            <Input
              id="team-invite-email"
              type="email"
              value={state.inviteEmail()}
              onInput={(event) => state.inviteEmailChange(event.currentTarget.value)}
              autocomplete="off"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="team-invite-role">Teamrolle</Label>
            <SelectSingleNative
              id="team-invite-role"
              valueSignal={{ get: state.inviteRole, set: state.inviteRoleChange }}
              getOptions={() => [...teamRoleOptions]}
              valueText={(value) => state.roleLabel(value as (typeof teamRoleOptions)[number])}
            />
            <p class="text-xs text-content-muted">{state.roleDescription(state.inviteRoleValue())}</p>
          </div>
          <Show when={state.error() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.error()}
            </p>
          </Show>
        </div>
      </ModalDialog>

      <ModalDialog
        open={state.dialog() === "rolle"}
        onOpenChange={(open) => {
          if (!open) state.closeDialog()
        }}
        title="Teamrolle ändern"
        description="Die Mitgliedschaft in der Organisation (Mitglied oder Gast) bleibt unverändert."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => state.closeDialog()}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="contrast"
              disabled={state.submitting() || !state.canSubmitRole()}
              onClick={() => void state.submitRole()}
            >
              {state.submitting() ? "Wird gespeichert …" : "Rolle speichern"}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4">
          <p class="text-sm text-content-muted">
            {state.selectedMember()?.name ?? "Dieses Mitglied"} · aktuell:{" "}
            {state.selectedMember()?.organizerRole
              ? state.roleLabel(state.selectedMember()?.organizerRole ?? "admin")
              : "ohne Teamrolle"}
          </p>
          <Show when={state.selectedMemberFeedback()}>
            {(feedback) => (
              <div role="status" class="text-sm text-content-muted">
                <p>{feedback()}</p>
                <Show when={!state.membersDone()}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={state.membersLoading()}
                    onClick={() => state.loadMoreMembers()}
                  >
                    Weitere Mitglieder laden
                  </Button>
                </Show>
              </div>
            )}
          </Show>
          <div class="flex flex-col gap-1.5">
            <Label for="team-role-select">Teamrolle</Label>
            <SelectSingleNative
              id="team-role-select"
              valueSignal={{ get: state.roleSelection, set: state.roleSelectionChange }}
              getOptions={() => [...roleSelectionOptions]}
              valueText={(value) => (value === "" ? "Teamrolle entfernen" : state.roleLabel(value as never))}
            />
          </div>
          <Show when={state.error() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.error()}
            </p>
          </Show>
        </div>
      </ModalDialog>

      <ModalDialog
        open={state.dialog() === "entfernen"}
        onOpenChange={(open) => {
          if (!open) state.closeDialog()
        }}
        title="Aus Team entfernen"
        description="Diese Person verliert die Teamrolle. Die Mitgliedschaft in der Organisation bleibt erhalten."
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => state.closeDialog()}>
              Abbrechen
            </Button>
            <Button
              type="button"
              variant="contrast"
              disabled={state.submitting() || !state.canSubmitRemove()}
              onClick={() => void state.submitRemove()}
            >
              {state.submitting() ? "Wird entfernt …" : "Aus Team entfernen"}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-3">
          <Show when={state.selectedMemberFeedback()}>
            {(feedback) => (
              <div role="status" class="text-sm text-content-muted">
                <p>{feedback()}</p>
                <Show when={!state.membersDone()}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={state.membersLoading()}
                    onClick={() => state.loadMoreMembers()}
                  >
                    Weitere Mitglieder laden
                  </Button>
                </Show>
              </div>
            )}
          </Show>
          <p class="text-sm text-content">
            {state.selectedMember()?.name ?? "Dieses Mitglied"} verliert die Teamrolle. Die Rolle in der Organisation
            (Mitglied oder Gast) und alle daraus folgenden Rechte bleiben bestehen.
          </p>
          <Show when={state.error() !== null}>
            <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {state.error()}
            </p>
          </Show>
        </div>
      </ModalDialog>
    </div>
  )
}
