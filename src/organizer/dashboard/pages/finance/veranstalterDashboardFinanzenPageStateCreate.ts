import { createMemo } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import type { VeranstalterDashboardFinanzenSearch } from "./veranstalterDashboardFinanzenSearchParse.ts"

const moneyFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })
export function veranstalterDashboardFinanzenMoneyFormat(cents: number) {
  return moneyFormat.format(cents / 100)
}

const timeFormat = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
})
export function veranstalterDashboardFinanzenTimeFormat(instant: string) {
  const value = new Date(instant)
  return Number.isNaN(value.getTime()) ? "—" : `${timeFormat.format(value)} (Berlin)`
}

export function veranstalterDashboardFinanzenPageStateCreate(inputs: {
  search: () => VeranstalterDashboardFinanzenSearch
  changeSearch: (search: VeranstalterDashboardFinanzenSearch) => void
}) {
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const canRead = () => page.shell.activeOrganization()?.permissions.includes("finanzen.sehen") ?? false
  const overview = queryCreate(api.organizerDashboardFinance.organizerDashboardFinanceOverviewQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canRead()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      ...(inputs.search().event ? { eventKey: inputs.search().event } : {}),
    }
  })
  const payouts = queryCreate(api.organizerDashboardFinance.organizerDashboardPayoutListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canRead()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      ...(inputs.search().event ? { eventKey: inputs.search().event } : {}),
      paginationOpts: { numItems: 25, cursor: null },
    }
  })
  const payoutRun = mutationCreate(api.organizerDashboardFinance.organizerDashboardPayoutRecordMutation)
  const payoutStatusRun = mutationCreate(api.organizerDashboardFinance.organizerDashboardPayoutStatusUpdateMutation)
  const amount = createSignalObject("")
  const note = createSignalObject("")
  const message = createSignalObject("")
  const busy = createSignalObject(false)

  const selectEvent = (eventKey: string | undefined) =>
    inputs.changeSearch(eventKey ? { org: inputs.search().org, event: eventKey } : { org: inputs.search().org })

  const recordPayout = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    const eventKey = inputs.search().event
    if (!orgId || !eventKey || busy.get()) return
    const cents = Math.round(Number(amount.get().replace(",", ".")) * 100)
    if (!Number.isInteger(cents) || cents <= 0) {
      message.set("Betrag in Euro eingeben, z. B. 123,45.")
      return
    }
    busy.set(true)
    try {
      const result = await payoutRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        amountCents: cents,
        ...(note.get().trim() ? { note: note.get().trim() } : {}),
      })
      if (result && typeof result === "object" && "success" in result && result.success) {
        amount.set("")
        note.set("")
        message.set("Auszahlung vorgemerkt.")
      } else {
        message.set("Auszahlung fehlgeschlagen.")
      }
    } finally {
      busy.set(false)
    }
  }

  const selectedEvent = () => inputs.search().event
  const markPayoutPaid = async (payoutId: string) => {
    const orgId = page.orgId()
    if (!orgId || busy.get() || !canRead()) return
    busy.set(true)
    try {
      const result = await payoutStatusRun({
        orgId: orgId as Id<"orgs">,
        payoutId: payoutId as Id<"organizerDashboardPayouts">,
        status: "ausgezahlt",
      })
      message.set(
        result && typeof result === "object" && "success" in result && result.success
          ? "Auszahlung als ausgezahlt vermerkt."
          : "Vermerk fehlgeschlagen.",
      )
    } finally {
      busy.set(false)
    }
  }
  return {
    page,
    canRead,
    overview,
    payouts,
    markPayoutPaid,
    amount: amount.get,
    setAmount: amount.set,
    note: note.get,
    setNote: note.set,
    message: message.get,
    busy: busy.get,
    selectEvent,
    selectedEvent,
    recordPayout,
  }
}
