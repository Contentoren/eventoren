import { dashStateGet } from "../store/dashStateGet.ts"
import { dashOrderInvoicePdf } from "../store/actions/orders/dashOrderInvoicePdf.ts"
import { dashDownload } from "../export/dashDownload.ts"
import { dashFileNameCreate } from "../export/dashFileNameCreate.ts"
import { dashAccountInvoiceDownloadCreate } from "./model/dashAccountInvoiceDownloadCreate.ts"

export const dashAccountInvoiceDownload = dashAccountInvoiceDownloadCreate({
  stateGet: dashStateGet,
  invoicePdf: dashOrderInvoicePdf,
  download: dashDownload,
  fileNameCreate: dashFileNameCreate,
})
