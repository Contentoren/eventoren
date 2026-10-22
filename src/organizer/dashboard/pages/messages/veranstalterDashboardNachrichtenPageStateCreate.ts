import { createMemo } from "solid-js"
import type { Id } from "#convex/_generated/dataModel.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { organizerDashboardMessageReferences } from "../../api/organizerDashboardMessageReferences.ts"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardNachrichtenMutationsCreate } from "./veranstalterDashboardNachrichtenMutationsCreate.ts"
import type { VeranstalterDashboardNachrichtenSearch } from "./veranstalterDashboardNachrichtenSearchParse.ts"

export function veranstalterDashboardNachrichtenPageStateCreate(inputs: {
  search: () => VeranstalterDashboardNachrichtenSearch
  changeSearch: (search: VeranstalterDashboardNachrichtenSearch) => void
  eventKey: () => string | undefined
}) {
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => inputs.search().org,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const canSend = () => page.shell.activeOrganization()?.permissions.includes("nachrichten.senden") ?? false
  const mutations = veranstalterDashboardNachrichtenMutationsCreate()
  const messages = queryCreate(organizerDashboardMessageReferences.organizerDashboardMessageListQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canSend()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey }
  })
  const reminder = queryCreate(organizerDashboardMessageReferences.organizerDashboardMessageReminderGetQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canSend()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey }
  })
  const ics = queryCreate(organizerDashboardMessageReferences.organizerDashboardMessageIcsGetQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canSend()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey }
  })
  const message = createSignalObject("")
  const busy = createSignalObject(false)
  const run = async (work: () => Promise<unknown>) => {
    busy.set(true)
    message.set("")
    try {
      const result = (await work()) as { success: boolean; errorMessage?: string } | undefined
      if (result && !result.success) message.set(result.errorMessage ?? "Aktion fehlgeschlagen")
    } catch (error) {
      message.set(error instanceof Error ? error.message : "Aktion fehlgeschlagen")
    } finally {
      busy.set(false)
    }
  }
  const rows = createMemo(() => {
    const result = messages()
    return result && result.success ? result.data.messages : []
  })
  const reminderData = createMemo(() => {
    const result = reminder()
    return result && result.success ? result.data.reminder : undefined
  })
  const icsDownload = createMemo(() => {
    const result = ics()
    return result && result.success ? result.data : undefined
  })
  const scopeError = (): string | null => {
    const failed = [messages(), reminder(), ics()].find((result) => result !== undefined && !result.success)
    return failed !== undefined && !failed.success ? failed.errorMessage : null
  }
  return { shell: page.shell, canSend, rows, reminderData, icsDownload, message, busy, run, mutations, scopeError }
}
