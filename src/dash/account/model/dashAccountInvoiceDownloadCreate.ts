import { createResult, createResultError, type Result } from "#result"

export function dashAccountInvoiceDownloadCreate(deps: {
  stateGet: () => { orders: { id: string; invoiceNumber: string; number: string }[] }
  invoicePdf: (orderId: string) => Promise<Result<Uint8Array>>
  download: (fileName: string, data: Uint8Array, mimeType: string) => void
  fileNameCreate: (parts: string[], extension: string, now: Date) => string
}): (orderId: string, now: Date) => Promise<Result<string>> {
  return async (orderId: string, now: Date): Promise<Result<string>> => {
    const op = "dashAccountInvoiceDownload"
    const order = deps.stateGet().orders.find((candidate) => candidate.id === orderId)
    if (!order) return createResultError(op, "Bestellung nicht gefunden.")
    const pdf = await deps.invoicePdf(orderId)
    if (!pdf.success) return createResultError(op, pdf.errorMessage)
    const fileName = deps.fileNameCreate(["Rechnung", order.invoiceNumber || order.number], "pdf", now)
    deps.download(fileName, pdf.data, "application/pdf")
    return createResult(fileName)
  }
}
