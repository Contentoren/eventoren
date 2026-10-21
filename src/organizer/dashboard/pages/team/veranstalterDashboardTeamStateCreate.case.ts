import { expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, createResultError } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
const solidJsClient = (await import(solidJsClientPath)) as typeof import("solid-js")
mock.module("solid-js", () => solidJsClient)
const { createComponent, createRoot, batch } = solidJsClient
const { createSignalObject } = await import("#ui/utils/createSignalObject.js")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { organizerDashboardTeamStateCreate } = await import("./veranstalterDashboardTeamStateCreate.ts")
mock.restore()

type Dialog = "einladen" | "rolle" | "entfernen"
type Role = "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"
type Call = { name: string; args: Record<string, unknown> }
type Subscription = Call & { active: boolean; push: (value: unknown) => void }

function memberCreate(org: string, organizerRole: Role | null = "eventmanager", id = `member-${org}`) {
  return {
    id,
    userId: `user-${org}`,
    name: `Person ${org}`,
    email: `${org}@example.com`,
    role: "guest",
    organizerRole,
    invitedBy: "original-inviter",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}
function invitationCreate(org: string) {
  return {
    id: `invitation-${org}`,
    orgId: org,
    orgName: org,
    invitedEmail: `${org}@example.com`,
    organizerRole: "eventmanager",
    status: "pending",
    deliveryState: "skipped",
    deliveryAttempts: 1,
    deliveryReason: "development",
    expiresAt: "2027-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}
function harnessCreate(initialDialog: Dialog | undefined = "rolle", initialCanManage = true) {
  const orgId = createSignalObject<string | undefined>("A")
  const canManage = createSignalObject(initialCanManage)
  const dialog = createSignalObject<Dialog | undefined>(initialDialog)
  const memberId = createSignalObject<string | undefined>("member-A")
  const calls: Call[] = []
  const subscriptions: Subscription[] = []
  const finishes: ((value: unknown) => void)[] = []
  let defer = false
  const client = {
    mutation: async (reference: Parameters<typeof getFunctionName>[0], args: Record<string, unknown>) => {
      calls.push({ name: getFunctionName(reference), args })
      return defer ? new Promise((resolve) => finishes.push(resolve)) : createResult({})
    },
    onUpdate: (
      reference: Parameters<typeof getFunctionName>[0],
      args: Record<string, unknown>,
      push: (value: unknown) => void,
    ) => {
      const subscription = { name: getFunctionName(reference), args, push, active: true }
      subscriptions.push(subscription)
      return () => {
        subscription.active = false
      }
    },
  } as ConvexClient
  let captured: ReturnType<typeof organizerDashboardTeamStateCreate> | undefined
  const dispose = createRoot((disposeRoot) => {
    createComponent(convexClientContext.Provider, {
      value: client,
      get children() {
        return createComponent(eventorenAuthContext.Provider, {
          value: { ...eventorenAuthContext.defaultValue, token: () => "validated-token", ready: () => true },
          get children() {
            captured = organizerDashboardTeamStateCreate({
              orgId: orgId.get,
              canManage: canManage.get,
              dialog: dialog.get,
              memberId: memberId.get,
              openDialog: (value, id) =>
                batch(() => {
                  memberId.set(id)
                  dialog.set(value)
                }),
              closeDialog: () =>
                batch(() => {
                  dialog.set(undefined)
                  memberId.set(undefined)
                }),
            })
            return undefined
          },
        })
      },
    })
    return disposeRoot
  })
  if (!captured) throw new Error("Team state missing inside providers")
  const push = (
    org: string,
    kind: "members" | "invitations",
    page: unknown[],
    isDone = true,
    cursor: string | null = null,
  ) => {
    const queryName =
      kind === "members" ? "organizerDashboardTeamMemberListQuery" : "organizerDashboardTeamInvitationListQuery"
    const subscription = subscriptions.findLast(
      (entry) =>
        entry.active &&
        entry.name.endsWith(`:${queryName}`) &&
        entry.args.orgId === org &&
        (entry.args.paginationOpts as { cursor: string | null }).cursor === cursor,
    )
    if (!subscription) throw new Error(`No ${kind} subscription for ${org}, cursor ${cursor}`)
    subscription.push(createResult({ page, isDone, continueCursor: isDone ? "" : "next-page" }))
  }
  return {
    state: captured,
    calls,
    finishes,
    orgId,
    dialog,
    memberId,
    canManage,
    dispose,
    push,
    load: (org: string) => {
      push(org, "members", [memberCreate(org)])
      push(org, "invitations", [invitationCreate(org)])
    },
    defer: () => {
      defer = true
    },
  }
}

test("role URL reload waits for the loaded target then seeds its real role, never accidental null", async () => {
  const h = harnessCreate()
  try {
    expect(h.dialog.get()).toBe("rolle")
    expect(h.state.canSubmitRole()).toBe(false)
    await h.state.submitRole()
    expect(h.calls).toHaveLength(0)
    h.load("A")
    expect(h.state.roleSelection()).toBe("eventmanager")
    expect(h.state.canSubmitRole()).toBe(true)
    await h.state.submitRole()
    expect(h.calls[0]).toMatchObject({
      name: "organizerDashboardTeam:organizerDashboardTeamRoleUpdateMutation",
      args: { token: "validated-token", orgId: "A", memberId: "member-A", organizerRole: "eventmanager" },
    })
  } finally {
    h.dispose()
  }
})

test("same-target live updates retain user edits; a new target is seeded once", () => {
  const h = harnessCreate()
  try {
    h.load("A")
    h.state.roleSelectionChange("finanzen")
    h.push("A", "members", [memberCreate("A", "einlass")])
    expect(h.state.roleSelection()).toBe("finanzen")
    h.state.openRoleDialog("second")
    expect(h.state.canSubmitRole()).toBe(false)
    h.push("A", "members", [memberCreate("A", "admin", "second")])
    expect(h.state.roleSelection()).toBe("admin")
    h.state.roleSelectionChange("")
    h.push("A", "members", [memberCreate("A", "admin", "second")])
    expect(h.state.roleSelection()).toBe("")
  } finally {
    h.dispose()
  }
})

test("a target outside the first page is explicitly unavailable until manual paginated load-more resolves it", async () => {
  const h = harnessCreate()
  try {
    h.push("A", "members", [memberCreate("A", "admin", "someone-else")], false)
    expect(h.state.selectedMemberFeedback()).toContain("nicht geladen")
    await h.state.submitRole()
    h.state.openRemoveDialog("member-A")
    await h.state.submitRemove()
    expect(h.calls).toHaveLength(0)
    h.state.openRoleDialog("member-A")
    h.state.loadMoreMembers()
    expect(h.state.canSubmitRole()).toBe(false)
    h.push("A", "members", [memberCreate("A", "finanzen")], true, "next-page")
    expect(h.state.selectedMemberFeedback()).toBeNull()
    expect(h.state.canSubmitRole()).toBe(true)
    expect(h.state.roleSelection()).toBe("finanzen")
  } finally {
    h.dispose()
  }
})

test("organization transitions clear invitation drafts, feedback, selections and URL dialogs", async () => {
  const h = harnessCreate("einladen")
  try {
    h.load("A")
    h.state.inviteEmailChange("owner-in-A@example.com")
    h.state.inviteRoleChange("inhaber")
    h.state.roleSelectionChange("inhaber")
    h.orgId.set("B")
    expect(h.state.inviteEmail()).toBe("")
    expect(h.state.inviteRole()).toBe("eventmanager")
    expect(h.state.roleSelection()).toBe("")
    expect(h.state.error()).toBeNull()
    expect(h.state.message()).toBeNull()
    expect(h.dialog.get()).toBeUndefined()
    expect(h.state.selectedMember()).toBeUndefined()
    await h.state.submitInvite()
    await h.state.submitRole()
    await h.state.submitRemove()
    expect(h.calls).toHaveLength(0)
    h.orgId.set(undefined)
    expect(h.state.canSubmitRole()).toBe(false)
  } finally {
    h.dispose()
  }
})

test("a dialog opened while permissions load survives the grant", () => {
  const h = harnessCreate("einladen", false)
  try {
    expect(h.dialog.get()).toBe("einladen")
    h.state.openInviteDialog()
    h.canManage.set(true)
    expect(h.dialog.get()).toBe("einladen")
  } finally {
    h.dispose()
  }
})

test("losing the team permission closes an open dialog", () => {
  const h = harnessCreate("einladen")
  try {
    h.state.openInviteDialog()
    expect(h.dialog.get()).toBe("einladen")
    h.canManage.set(false)
    expect(h.dialog.get()).toBeUndefined()
  } finally {
    h.dispose()
  }
})

test("a context reload that briefly drops the org does not close an open dialog", () => {
  const h = harnessCreate("einladen")
  try {
    h.state.openInviteDialog()
    expect(h.dialog.get()).toBe("einladen")
    h.orgId.set(undefined)
    expect(h.dialog.get()).toBe("einladen")
    h.orgId.set("A")
    expect(h.dialog.get()).toBe("einladen")
  } finally {
    h.dispose()
  }
})

test("only a loaded matching target and current team permission can be removed", async () => {
  const h = harnessCreate("entfernen")
  try {
    await h.state.submitRemove()
    expect(h.calls).toHaveLength(0)
    h.load("A")
    expect(h.state.canSubmitRemove()).toBe(true)
    h.canManage.set(false)
    await h.state.submitRemove()
    expect(h.calls).toHaveLength(0)
    h.canManage.set(true)
    h.load("A")
    h.state.openRemoveDialog("member-A")
    await h.state.submitRemove()
    expect(h.calls[0]?.args.memberId).toBe("member-A")
  } finally {
    h.dispose()
  }
})

type Action = "invite" | "role" | "remove" | "revoke" | "resend"
function actionStart(h: ReturnType<typeof harnessCreate>, action: Action, org: string) {
  if (action === "invite") {
    h.state.openInviteDialog()
    h.state.inviteEmailChange(`draft-${org}@example.com`)
    return h.state.submitInvite()
  }
  if (action === "role") {
    h.state.openRoleDialog(`member-${org}`)
    return h.state.submitRole()
  }
  if (action === "remove") {
    h.state.openRemoveDialog(`member-${org}`)
    return h.state.submitRemove()
  }
  if (action === "revoke") return h.state.revokeInvitation(`invitation-${org}` as never)
  return h.state.resendInvitation(`invitation-${org}` as never)
}

for (const action of ["invite", "role", "remove", "revoke", "resend"] as const) {
  for (const outcome of ["success", "failure"] as const) {
    test(`old ${action} ${outcome} cannot change another scope's feedback, dialog, draft or newer pending state, including A -> B -> A`, async () => {
      for (const returnToA of [false, true]) {
        const h = harnessCreate(undefined)
        try {
          h.load("A")
          h.defer()
          const oldPending = actionStart(h, action, "A")
          expect(h.calls).toHaveLength(1)
          expect(h.state.submitting()).toBe(true)
          h.orgId.set("B")
          h.load("B")
          if (returnToA) {
            h.orgId.set("A")
            h.load("A")
          }
          const org = returnToA ? "A" : "B"
          const newPending = actionStart(h, action, org)
          expect(h.calls).toHaveLength(2)
          const newDialog = h.dialog.get()
          h.state.inviteEmailChange("new-user-edit@example.com")
          h.state.inviteRoleChange("finanzen")
          h.finishes[0]?.(outcome === "success" ? createResult({}) : createResultError("old", "old failure"))
          await oldPending
          expect(h.state.error()).toBeNull()
          expect(h.state.message()).toBeNull()
          expect(h.dialog.get()).toBe(newDialog)
          expect(h.state.inviteEmail()).toBe("new-user-edit@example.com")
          expect(h.state.inviteRole()).toBe("finanzen")
          expect(h.state.submitting()).toBe(true)
          h.finishes[1]?.(createResult({}))
          await newPending
          expect(h.state.submitting()).toBe(false)
          expect(h.calls[1]?.args.orgId).toBe(org)
        } finally {
          h.dispose()
        }
      }
    })
  }
}

test("an old mutation does not close a replacement dialog within the same organization", async () => {
  const h = harnessCreate("einladen")
  try {
    h.load("A")
    h.defer()
    const pending = actionStart(h, "invite", "A")
    h.state.closeDialog()
    h.state.openRoleDialog("member-A")
    h.finishes[0]?.(createResult({}))
    await pending
    expect(h.dialog.get()).toBe("rolle")
    expect(h.state.message()).toBeNull()
    expect(h.state.roleSelection()).toBe("eventmanager")
    expect(h.state.submitting()).toBe(false)
  } finally {
    h.dispose()
  }
})
