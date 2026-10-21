import { createMemo } from "solid-js"
import type { Id } from "#convex/_generated/dataModel.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { organizerDashboardGuestReferences } from "../../api/organizerDashboardGuestReferences.ts"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardGaestelisteMutationsCreate } from "./veranstalterDashboardGaestelisteMutationsCreate.ts"
import type { VeranstalterDashboardGaestelisteSearch } from "./veranstalterDashboardGaestelisteSearchParse.ts"

export function veranstalterDashboardGaestelistePageStateCreate(inputs: {
  search: () => VeranstalterDashboardGaestelisteSearch
  changeSearch: (search: VeranstalterDashboardGaestelisteSearch) => void
  eventKey: () => string | undefined
}) {
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => inputs.search().org,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const canEdit = () => page.shell.activeOrganization()?.permissions.includes("gaesteliste.bearbeiten") ?? false
  const mutations = veranstalterDashboardGaestelisteMutationsCreate()
  const quotas = queryCreate(organizerDashboardGuestReferences.organizerDashboardGuestQuotaListQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canEdit()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey }
  })
  const guests = queryCreate(organizerDashboardGuestReferences.organizerDashboardGuestListQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !canEdit()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey, search: inputs.search().q }
  })
  const message = createSignalObject("")
  const busy = createSignalObject(false)
  const draftQuery = createSignalObject(inputs.search().q ?? "")
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
  const quotaCards = createMemo(() => {
    const result = quotas()
    return result && result.success ? result.data.quotas : []
  })
  const guestRows = createMemo(() => {
    const result = guests()
    if (!result || !result.success) return []
    const quota = inputs.search().quota
    return quota ? result.data.guests.filter((guest) => guest.quotaId === quota) : result.data.guests
  })
  return {
    shell: page.shell,
    canEdit,
    quotas: quotaCards,
    guests: guestRows,
    quotasLoading: () => quotas() === undefined,
    guestsLoading: () => guests() === undefined,
    message,
    busy,
    run,
    mutations,
    draftQuery: draftQuery.get,
    queryChange: (value: string) => draftQuery.set(value),
    filtersSubmit: (event: SubmitEvent) => {
      event.preventDefault()
      inputs.changeSearch({ ...inputs.search(), q: draftQuery.get() })
    },
  }
}
