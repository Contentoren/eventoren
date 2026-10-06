import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { createResult, createResultError, type Result } from "#result"
import { billingEventorenClient } from "../ticketing/convex/billingEventorenClient.ts"
import type { AdminTicketOrderBillingDetails } from "./AdminTicketOrderBillingDetails.ts"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import { adminTicketOrderDetailsMap } from "./adminTicketOrderDetailsMap.ts"
import { apiClientCreate } from "../client/apiClient.ts"

const op = "adminTicketOrderBillingGet"

/**
 * Re-authorize the order through the existing admin query, but expose only
 * billing enrichment to the browser. The native live query owns order details.
 */
export async function adminTicketOrderBillingGet(
  input: { readonly token: string; readonly orderId: string },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<AdminTicketOrderBillingDetails>> {
  try {
    const response = await client.query(api.ticketing.ticketOrderGetAdminQuery, input as never)
    if (!response.success) return createResultError(op, "Bestellung konnte nicht geladen werden.")
    const local = response.data as Omit<AdminTicketOrderDetails, "stripeDetails" | "stripeError">
    if (!local.billingOrderReference) return createResult(billingDetailsMap(adminTicketOrderDetailsMap(local, null)))

    try {
      const config = billingEventorenClient.configRead({ baseUrl: billingHostBaseUrlGet() })
      if (!config.success)
        return createResult(
          billingDetailsMap(
            adminTicketOrderDetailsMap(local, { success: false, errorMessage: "Billing ist nicht verfügbar." }),
          ),
        )
      const billing = await billingEventorenClient.ticketPaymentDetailsGet(config.data, {
        paymentReference: local.paymentReference,
        orderReference: local.billingOrderReference,
      })
      return createResult(billingDetailsMap(adminTicketOrderDetailsMap(local, billing)))
    } catch {
      return createResult(
        billingDetailsMap(
          adminTicketOrderDetailsMap(local, { success: false, errorMessage: "Billing ist nicht verfügbar." }),
        ),
      )
    }
  } catch {
    return createResultError(op, "Bestelldetails konnten nicht geladen werden.")
  }
}

function billingDetailsMap(details: AdminTicketOrderDetails): AdminTicketOrderBillingDetails {
  return {
    bookingNumber: details.bookingNumber,
    bookingReference: details.bookingReference,
    stripeDetails: details.stripeDetails,
    stripeError: details.stripeError,
  }
}

function billingHostBaseUrlGet(): string | undefined {
  if (process.env.NODE_ENV !== "development" || process.env.EVENTOREN_BILLING_STRIPE_MODE !== "test") return undefined
  if (process.env.EVENTOREN_BILLING_BASE_URL?.trim().replace(/\/$/u, "") !== "http://169.254.1.2:3146") return undefined
  return "http://127.0.0.1:3146"
}
