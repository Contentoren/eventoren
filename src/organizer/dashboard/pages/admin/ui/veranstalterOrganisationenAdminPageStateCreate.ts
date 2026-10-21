import { createRenderEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { veranstalterOrganisationenAdminConfigureValidate } from "./veranstalterOrganisationenAdminConfigureValidate.ts"
import type { VeranstalterOrganisationenAdminSearch } from "./veranstalterOrganisationenAdminSearchParse.ts"

/**
 * Admin organisation state: paginated global list with status filter plus a
 * URL-driven detail sheet (org id). Every control calls a real global-admin
 * backend function; approval stays gated on admin-confirmed configuration,
 * blocking requires a non-empty reason. Fee/tax inputs map to the canonical
 * integer units (percent to bps, euro to cents); tax status and the 7 %/19 %
 * rate are independent fields.
 */
export function veranstalterOrganisationenAdminPageStateCreate(inputs: {
  readonly search: () => VeranstalterOrganisationenAdminSearch
  readonly selectOrg: (orgId: string | undefined) => void
}) {
  const list = queryPaginatedCreate(
    api.organizerDashboardAdmin.organizerDashboardAdminListQuery,
    () => ({ ...(inputs.search().status ? { status: inputs.search().status as string } : {}) }),
    { pageSize: 20, allPages: true },
  )
  const detailResult = queryCreate(api.organizerDashboardAdmin.organizerDashboardAdminDetailQuery, () =>
    inputs.search().org ? { orgId: inputs.search().org as Id<"orgs"> } : undefined,
  )
  const configureOrganization = mutationCreate(api.organizerDashboardAdmin.organizerDashboardAdminConfigureMutation)
  const approveOrganization = mutationCreate(api.organizerDashboardAdmin.organizerDashboardAdminApproveMutation)
  const blockOrganization = mutationCreate(api.organizerDashboardAdmin.organizerDashboardAdminBlockMutation)
  const unblockOrganization = mutationCreate(api.organizerDashboardAdmin.organizerDashboardAdminUnblockMutation)

  const taxStatus = createSignalObject("regel")
  const taxRateBps = createSignalObject("1900")
  const feePercent = createSignalObject("0")
  const feeFixedEuro = createSignalObject("0,00")
  const feePayer = createSignalObject("kaeufer")
  const blockReason = createSignalObject("")
  const unblockTarget = createSignalObject("pruefung")
  const serverError = createSignalObject<string | null>(null)
  const working = createSignalObject(false)
  const confirmed = createSignalObject<string | null>(null)
  let configurePrefilledFor: string | null = null

  const detail = () => {
    const current = detailResult()
    if (!current || !current.success) return null
    return current.data
  }
  const detailError = (): string | null => {
    const current = detailResult()
    if (!current) return null
    return current.success ? null : current.errorMessage
  }

  createRenderEffect(() => {
    const data = detail()
    const orgId = inputs.search().org
    if (!data || !orgId || configurePrefilledFor === orgId) return
    configurePrefilledFor = orgId
    confirmed.set(null)
    blockReason.set("")
    taxStatus.set(data.tax.status)
    taxRateBps.set(String(data.tax.defaultRateBps))
    feePercent.set(String(data.fee.percentBps / 100).replace(".", ","))
    feeFixedEuro.set((data.fee.fixedCents / 100).toFixed(2).replace(".", ","))
    feePayer.set(data.fee.payer)
    unblockTarget.set(data.status === "gesperrt" ? "pruefung" : data.status)
  })

  const configureValidation = () =>
    veranstalterOrganisationenAdminConfigureValidate({
      orgId: inputs.search().org ?? "",
      taxStatus: taxStatus.get(),
      taxRateBps: taxRateBps.get(),
      feePercent: feePercent.get(),
      feeFixedEuro: feeFixedEuro.get(),
      feePayer: feePayer.get(),
    })
  const approveBlocker = (): string | null => {
    const data = detail()
    if (!data) return "Keine Organisation ausgewählt."
    if (data.status !== "pruefung") return "Nur Organisationen in Prüfung können freigegeben werden."
    if (!data.configurationConfirmed) {
      return "Vor der Freigabe muss die Steuer- und Gebührenkonfiguration gespeichert werden."
    }
    return null
  }

  const runGuarded = async (work: () => Promise<{ success: boolean; errorMessage?: string }>) => {
    working.set(true)
    serverError.set(null)
    confirmed.set(null)
    try {
      const result = await work()
      if (!result.success) {
        serverError.set(result.errorMessage ?? "Unbekannter Fehler")
        return
      }
      confirmed.set("Gespeichert.")
      configurePrefilledFor = null
    } finally {
      working.set(false)
    }
  }

  const configureSave = () =>
    runGuarded(async () => {
      const validated = configureValidation()
      if (!validated.success) return validated
      return configureOrganization({
        orgId: inputs.search().org as Id<"orgs">,
        tax: validated.data.tax,
        fee: validated.data.fee,
      })
    })
  const approve = () =>
    runGuarded(async () => {
      const blocked = approveBlocker()
      if (blocked !== null) return { success: false as const, errorMessage: blocked }
      return approveOrganization({ orgId: inputs.search().org as Id<"orgs"> })
    })
  const block = () =>
    runGuarded(async () => {
      const reason = blockReason.get().trim()
      if (reason.length === 0) {
        return { success: false as const, errorMessage: "Eine Sperrung braucht einen Grund." }
      }
      return blockOrganization({ orgId: inputs.search().org as Id<"orgs">, reason })
    })
  const unblock = () =>
    runGuarded(async () => {
      if (unblockTarget.get() !== "pruefung" && unblockTarget.get() !== "aktiv") {
        return { success: false as const, errorMessage: "Entsperren braucht pruefung oder aktiv als Ziel." }
      }
      return unblockOrganization({
        orgId: inputs.search().org as Id<"orgs">,
        status: unblockTarget.get(),
      })
    })
  const closeDetail = () => inputs.selectOrg(undefined)
  const selectOrg = (orgId: string) => inputs.selectOrg(orgId)
  const listItems = (): readonly unknown[] => {
    const current = list.result()
    if (!current || !current.success) return []
    return current.data
  }
  const listError = (): string | null => {
    const current = list.result()
    if (!current || current.success) return null
    return current.errorMessage
  }
  const configureError = (): string | null => {
    const validated = configureValidation()
    return validated.success ? null : validated.errorMessage
  }

  return {
    selectOrg,
    list,
    listItems,
    listError,
    configureError,
    detail,
    detailError,
    taxStatus,
    taxRateBps,
    feePercent,
    feeFixedEuro,
    feePayer,
    blockReason,
    unblockTarget,
    serverError,
    working,
    confirmed,
    configureValidation,
    approveBlocker,
    configureSave,
    approve,
    block,
    unblock,
    closeDetail,
  }
}

export type VeranstalterOrganisationenAdminPageState = ReturnType<typeof veranstalterOrganisationenAdminPageStateCreate>
