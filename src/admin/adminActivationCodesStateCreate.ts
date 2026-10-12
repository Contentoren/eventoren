import { createEffect, on, useContext } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { FunctionReference, PaginationOptions } from "convex/server"
import { createResultError, type Result } from "#result"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import { ticketActivationCodeLimits } from "../ticketing/ticketActivationCodeLimits.ts"
import type { TicketActivationCode } from "../ticketing/TicketActivationCode.ts"
import type { TicketActivationCodeExport } from "../ticketing/TicketActivationCodeExport.ts"
import type { TicketActivationCodeGenerateResult } from "../ticketing/TicketActivationCodeGenerateResult.ts"
import type { TicketActivationCodeListPage } from "../ticketing/TicketActivationCodeListPage.ts"
import type { TicketActivationCodeStatus } from "../ticketing/TicketActivationCodeStatus.ts"
import { ticketActivationCodesCsvFormat } from "../ticketing/ticketActivationCodesCsvFormat.ts"
import { ticketActivationCodesPdfGenerate } from "../ticketing/ticketActivationCodesPdfGenerate.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { convexClientContext } from "#src/utils/convex_client/convexClientContext.ts"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { adminActivationCodeBlobDownload } from "./adminActivationCodeBlobDownload.ts"
import { adminActivationCodeCountParse } from "./adminActivationCodeCountParse.ts"
import { adminActivationCodeExportFilename } from "./adminActivationCodeExportFilename.ts"

const pageSize = 50

export function adminActivationCodesStateCreate(inputs: {
  readonly eventKey: () => string | undefined
  readonly tiers: () => readonly EventTicketTier[]
  readonly generate?: (input: {
    readonly eventKey: string
    readonly tierKey: string
    readonly count: number
  }) => Promise<Result<TicketActivationCodeGenerateResult>>
  readonly listPage?: (input: {
    readonly eventKey: string
    readonly tierKey: string
    readonly status?: TicketActivationCodeStatus
    readonly paginationOpts: PaginationOptions
  }) => Promise<Result<TicketActivationCodeListPage>>
  readonly exportAll?: (input: {
    readonly eventKey: string
    readonly tierKey: string
  }) => Promise<Result<TicketActivationCodeExport>>
  readonly downloadBlob?: (blob: Blob, filename: string) => void
}) {
  const selectedTierKey = createSignalObject("")
  const statusFilter = createSignalObject<"" | TicketActivationCodeStatus>("")
  const countInput = createSignalObject("50")
  const codes = createSignalObject<readonly TicketActivationCode[]>([])
  const cursor = createSignalObject<string | null>(null)
  const isDone = createSignalObject(true)
  const isLoading = createSignalObject(false)
  const errorMessage = createSignalObject("")
  const feedback = createSignalObject("")
  const generatePending = createSignalObject(false)
  const exportPending = createSignalObject(false)
  let listRequest = 0

  const tiersWithRequirementFirst = () => {
    const all = [...inputs.tiers()]
    all.sort(
      (left, right) => Number(right.activationCodeRequired ?? false) - Number(left.activationCodeRequired ?? false),
    )
    return all
  }
  const selectedTier = () => inputs.tiers().find((tier) => tier.id === selectedTierKey.get())

  const pageLoad = async () => {
    const listPage = inputs.listPage
    const eventKey = inputs.eventKey()
    const tierKey = selectedTierKey.get()
    if (!listPage || !eventKey || !tierKey || isLoading.get() || isDone.get()) return
    const request = listRequest
    isLoading.set(true)
    errorMessage.set("")
    const result = await listPage({
      eventKey,
      tierKey,
      ...(statusFilter.get() ? { status: statusFilter.get() as TicketActivationCodeStatus } : {}),
      paginationOpts: { cursor: cursor.get(), numItems: pageSize },
    })
    if (request !== listRequest) return
    if (!result.success) {
      isLoading.set(false)
      errorMessage.set(result.errorMessage)
      return
    }
    const knownIds = new Set(codes.get().map((code) => code.id))
    codes.set([...codes.get(), ...result.data.page.filter((code) => !knownIds.has(code.id))])
    cursor.set(result.data.continueCursor)
    isDone.set(result.data.isDone)
    isLoading.set(false)
  }

  const reload = () => {
    listRequest++
    codes.set([])
    cursor.set(null)
    isDone.set(inputs.listPage ? false : true)
    isLoading.set(false)
    errorMessage.set("")
    if (inputs.listPage) void pageLoad()
  }

  // Default to the first code-gated product once tiers load; if the selected
  // product disappears (archive/removal), fall back to a remaining product or
  // clear the selection so list/generate/export never use a stale tier.
  createEffect(
    on(
      () => inputs.tiers().map((tier) => tier.id),
      () => {
        const available = tiersWithRequirementFirst()
        const current = selectedTierKey.get()
        if (available.length === 0) {
          if (current !== "") {
            selectedTierKey.set("")
            feedback.set("")
            reload()
          }
          return
        }
        if (!current || !available.some((tier) => tier.id === current)) {
          const first = available[0]
          if (first && first.id !== current) {
            selectedTierKey.set(first.id)
            feedback.set("")
            reload()
          }
        }
      },
    ),
  )

  const nativeList =
    inputs.listPage === undefined
      ? queryPaginatedCreate(
          api.ticketing.ticketActivationCodeListAdminQuery as ActivationCodePageQuery,
          () => {
            const eventKey = inputs.eventKey()
            const tierKey = selectedTierKey.get()
            if (!eventKey || !tierKey) return undefined
            return {
              eventKey,
              tierKey,
              ...(statusFilter.get() ? { status: statusFilter.get() as TicketActivationCodeStatus } : {}),
            }
          },
          { pageSize },
        )
      : undefined
  const nativeGenerate =
    inputs.generate === undefined ? mutationCreate(api.ticketing.ticketActivationCodeGenerateMutation) : undefined

  createEffect(() => {
    if (inputs.listPage || !nativeList) return
    const result = nativeList.result()
    if (!result) {
      isLoading.set(nativeList.isLoading())
      return
    }
    if (!result.success) {
      isLoading.set(false)
      errorMessage.set(result.errorMessage)
      return
    }
    codes.set(result.data)
    isDone.set(nativeList.isDone())
    isLoading.set(nativeList.isLoading())
  })

  const selectTier = (tierKey: string) => {
    if (selectedTierKey.get() === tierKey) return
    selectedTierKey.set(tierKey)
    feedback.set("")
    reload()
  }

  const selectStatus = (status: "" | TicketActivationCodeStatus) => {
    if (statusFilter.get() === status) return
    statusFilter.set(status)
    reload()
  }

  const generate = async () => {
    const eventKey = inputs.eventKey()
    const tierKey = selectedTierKey.get()
    if (!eventKey || !tierKey || generatePending.get()) return
    const count = adminActivationCodeCountParse(countInput.get())
    if (count === null) {
      errorMessage.set(`Bitte eine Anzahl zwischen 1 und ${ticketActivationCodeLimits.countMax} eingeben.`)
      return
    }
    const request = listRequest
    generatePending.set(true)
    errorMessage.set("")
    feedback.set("")
    try {
      const result = inputs.generate
        ? await inputs.generate({ eventKey, tierKey, count })
        : await nativeGenerate!({ eventKey, tierKey, count })
      if (request !== listRequest || selectedTierKey.get() !== tierKey || inputs.eventKey() !== eventKey) return
      if (!result.success) {
        errorMessage.set(result.errorMessage)
        return
      }
      const data = result.data as TicketActivationCodeGenerateResult
      const first = data.generated[0]?.number ?? data.lastNumber
      feedback.set(
        `${data.generated.length} ${data.generated.length === 1 ? "Code" : "Codes"} erzeugt (Nummern ${first}–${data.lastNumber}).`,
      )
      reload()
    } catch {
      if (request !== listRequest || selectedTierKey.get() !== tierKey || inputs.eventKey() !== eventKey) return
      errorMessage.set("Freischaltungscodes konnten nicht erzeugt werden.")
    } finally {
      generatePending.set(false)
    }
  }

  const auth = useContext(eventorenAuthContext)
  const convexClient = useContext(convexClientContext)

  const nativeExportAll = async (input: {
    readonly eventKey: string
    readonly tierKey: string
  }): Promise<Result<TicketActivationCodeExport>> => {
    const op = "adminActivationCodesExport"
    const token = auth.token()
    if (!convexClient) return createResultError(op, "No Convex client")
    if (!auth.ready() || !token) return createResultError(op, "Anmeldung erforderlich")
    try {
      return (await convexClient.query(api.ticketing.ticketActivationCodeExportAdminQuery, {
        ...input,
        token,
      })) as Result<TicketActivationCodeExport>
    } catch {
      return createResultError(op, "Freischaltungscodes konnten nicht exportiert werden.")
    }
  }

  const exportSnapshotGet = async (eventKey: string, tierKey: string): Promise<TicketActivationCodeExport | null> => {
    const result = inputs.exportAll
      ? await inputs.exportAll({ eventKey, tierKey })
      : await nativeExportAll({ eventKey, tierKey })
    if (!result.success) {
      if (selectedTierKey.get() !== tierKey || inputs.eventKey() !== eventKey) return null
      errorMessage.set(result.errorMessage)
      return null
    }
    // Stable number order regardless of backend batching; export ignores the
    // visible status filter and always covers the whole selected product.
    const ordered = [...result.data.codes].sort((left, right) => left.number - right.number)
    return { ...result.data, codes: ordered }
  }

  const exportRun = async (format: "csv" | "pdf") => {
    const eventKey = inputs.eventKey()
    const tierKey = selectedTierKey.get()
    if (!eventKey || !tierKey || exportPending.get()) return
    const request = listRequest
    exportPending.set(true)
    errorMessage.set("")
    feedback.set("")
    try {
      const snapshot = await exportSnapshotGet(eventKey, tierKey)
      if (request !== listRequest || selectedTierKey.get() !== tierKey || inputs.eventKey() !== eventKey) return
      if (!snapshot) return
      const { eventName, productName, codes } = snapshot
      const filename = adminActivationCodeExportFilename(eventName, productName, format)
      const download = inputs.downloadBlob ?? adminActivationCodeBlobDownload
      if (format === "csv") {
        const csv = ticketActivationCodesCsvFormat(eventName, productName, codes)
        download(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename)
      } else {
        const pdf = await ticketActivationCodesPdfGenerate(eventName, productName, codes)
        download(new Blob([pdf as unknown as BlobPart], { type: "application/pdf" }), filename)
      }
      feedback.set(`${codes.length} ${codes.length === 1 ? "Code" : "Codes"} als ${format.toUpperCase()} exportiert.`)
    } catch {
      if (request !== listRequest || selectedTierKey.get() !== tierKey || inputs.eventKey() !== eventKey) return
      errorMessage.set(
        format === "csv"
          ? "Freischaltungscodes konnten nicht als CSV exportiert werden."
          : "Freischaltungscodes konnten nicht als PDF exportiert werden.",
      )
    } finally {
      exportPending.set(false)
    }
  }

  return {
    tiers: tiersWithRequirementFirst,
    selectedTierKey: selectedTierKey.get,
    selectedTier,
    statusFilter: statusFilter.get,
    countInput,
    codes: codes.get,
    isDone: isDone.get,
    isLoading: isLoading.get,
    errorMessage: errorMessage.get,
    feedback: feedback.get,
    generatePending: generatePending.get,
    exportPending: exportPending.get,
    countMax: ticketActivationCodeLimits.countMax,
    selectTier,
    selectStatus,
    generate,
    exportCsv: () => exportRun("csv"),
    exportPdf: () => exportRun("pdf"),
    reload,
    loadMore: () => {
      if (inputs.listPage) void pageLoad()
      else nativeList?.loadMore()
    },
    tierName: (tierKey: string) => inputs.tiers().find((tier) => tier.id === tierKey)?.name ?? tierKey,
    customerLabel: (code: TicketActivationCode) => {
      const name = [code.customerGivenName, code.customerFamilyName].filter(Boolean).join(" ")
      if (name && code.customerEmail) return `${name} (${code.customerEmail})`
      return name || code.customerEmail || "—"
    },
    orderLabel: (code: TicketActivationCode) =>
      code.orderBookingReference ?? (code.orderBookingNumber !== null ? String(code.orderBookingNumber) : "—"),
    statusLabel: (status: TicketActivationCodeStatus) =>
      ({ available: "Verfügbar", reserved: "Reserviert", consumed: "Verbraucht" })[status],
    statusTone: (status: TicketActivationCodeStatus): "success" | "warning" | "neutral" =>
      status === "available" ? "success" : status === "reserved" ? "warning" : "neutral",
  }
}

type ActivationCodePageQuery = FunctionReference<
  "query",
  "public",
  {
    readonly token: string
    readonly eventKey: string
    readonly tierKey: string
    readonly status?: TicketActivationCodeStatus
    readonly paginationOpts: PaginationOptions
  },
  Result<TicketActivationCodeListPage>
>
