import { createMemo } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import type { VeranstalterDashboardGutscheineSearch } from "./veranstalterDashboardGutscheineSearchParse.ts"

function veranstalterDashboardGutscheineEuroToCents(raw: string): number | undefined {
  const cents = Math.round(Number(raw.replace(/\s/g, "").replace(",", ".")) * 100)
  return Number.isInteger(cents) && cents > 0 ? cents : undefined
}

export function veranstalterDashboardGutscheinePageStateCreate(inputs: {
  search: () => VeranstalterDashboardGutscheineSearch
  changeSearch: (search: VeranstalterDashboardGutscheineSearch) => void
}) {
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const canEdit = () => page.shell.activeOrganization()?.permissions.includes("gutscheine.bearbeiten") ?? false

  const vouchers = queryCreate(api.organizerDashboardPricing.organizerDashboardVoucherListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canEdit()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null },
    }
  })

  const issueRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardVoucherIssueMutation)
  const redeemRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardVoucherRedeemMutation)
  const deactivateRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardVoucherDeactivateMutation)

  const busy = createSignalObject(false)
  const message = createSignalObject("")
  const issueCode = createSignalObject("")
  const issueAmount = createSignalObject("")
  const issueValidity = createSignalObject<string>("3-jahre-jahresende")
  const issueDate = createSignalObject("")
  const issueName = createSignalObject("")
  const issueEmail = createSignalObject("")
  const issueMessage = createSignalObject("")
  const redeemCode = createSignalObject("")
  const redeemAmount = createSignalObject("")
  const redeemOrder = createSignalObject("")

  const totals = createMemo(() => {
    const data = vouchers()
    if (!data || !("success" in data) || !data.success) return undefined
    let issued = 0
    let open = 0
    let redeemed = 0
    for (const row of data.data.page) {
      issued += row.initialCents
      open += row.balanceCents
      if (row.status === "eingeloest") redeemed += 1
    }
    return { issued, open, redeemed, count: data.data.page.length }
  })

  const issue = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    if (!orgId || busy.get() || !canEdit()) return
    const initialCents = veranstalterDashboardGutscheineEuroToCents(issueAmount.get())
    if (initialCents === undefined) {
      message.set("Wert in Euro eingeben, z. B. 25,00.")
      return
    }
    const validity = issueValidity.get()
    if (
      validity !== "1-jahr" &&
      validity !== "2-jahre" &&
      validity !== "3-jahre-jahresende" &&
      validity !== "unbegrenzt" &&
      validity !== "datum"
    ) {
      message.set("Gültigkeit wählen.")
      return
    }
    if (validity === "datum" && !/^\d{4}-\d{2}-\d{2}$/.test(issueDate.get())) {
      message.set("Eigenes Datum als JJJJ-MM-TT eingeben.")
      return
    }
    busy.set(true)
    try {
      const result = await issueRun({
        orgId: orgId as Id<"orgs">,
        ...(issueCode.get().trim() ? { code: issueCode.get().trim() } : {}),
        initialCents,
        validity,
        ...(validity === "datum" ? { customDate: issueDate.get() } : {}),
        ...(issueName.get().trim() ? { recipientName: issueName.get().trim() } : {}),
        ...(issueEmail.get().trim() ? { recipientEmail: issueEmail.get().trim() } : {}),
        ...(issueMessage.get().trim() ? { message: issueMessage.get().trim() } : {}),
      })
      if (result && typeof result === "object" && "success" in result && result.success) {
        issueCode.set("")
        issueAmount.set("")
        issueDate.set("")
        issueName.set("")
        issueEmail.set("")
        issueMessage.set("")
        message.set(`Gutschein ${(result.data as { code: string }).code} ausgestellt.`)
      } else {
        message.set("Gutschein konnte nicht ausgestellt werden.")
      }
    } finally {
      busy.set(false)
    }
  }

  const redeem = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    if (!orgId || busy.get() || !canEdit()) return
    const amountCents = veranstalterDashboardGutscheineEuroToCents(redeemAmount.get())
    if (redeemCode.get().trim() === "" || amountCents === undefined || redeemOrder.get().trim() === "") {
      message.set("Code, Betrag und Bestellreferenz ausfüllen.")
      return
    }
    busy.set(true)
    try {
      const result = await redeemRun({
        orgId: orgId as Id<"orgs">,
        code: redeemCode.get().trim(),
        amountCents,
        orderRef: redeemOrder.get().trim(),
      })
      if (result && typeof result === "object" && "success" in result && result.success) {
        redeemCode.set("")
        redeemAmount.set("")
        redeemOrder.set("")
        const balance = (result.data as { balanceCents: number }).balanceCents
        message.set(`Eingelöst. Restguthaben: ${(balance / 100).toFixed(2).replace(".", ",")} €.`)
      } else {
        message.set("Einlösung fehlgeschlagen (Guthaben, Gültigkeit oder Status prüfen).")
      }
    } finally {
      busy.set(false)
    }
  }

  const deactivate = async (voucherId: string) => {
    const orgId = page.orgId()
    if (!orgId || busy.get() || !canEdit()) return
    busy.set(true)
    try {
      const result = await deactivateRun({
        orgId: orgId as Id<"orgs">,
        voucherId: voucherId as Id<"organizerDashboardVouchers">,
      })
      message.set(
        result && typeof result === "object" && "success" in result && result.success
          ? "Gutschein deaktiviert."
          : "Deaktivieren fehlgeschlagen.",
      )
    } finally {
      busy.set(false)
    }
  }

  return {
    page,
    canEdit,
    vouchers,
    totals,
    busy: busy.get,
    message: message.get,
    issueCode,
    issueAmount,
    issueValidity,
    issueDate,
    issueName,
    issueEmail,
    issueMessage,
    redeemCode,
    redeemAmount,
    redeemOrder,
    issue,
    redeem,
    deactivate,
  }
}

export type VeranstalterDashboardGutscheinePageState = ReturnType<typeof veranstalterDashboardGutscheinePageStateCreate>
