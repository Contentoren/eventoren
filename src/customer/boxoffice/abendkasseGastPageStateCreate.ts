import { createRenderEffect, onCleanup, useContext } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResultError, type Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { convexClientContext } from "#src/utils/convex_client/convexClientContext.ts"
import type { OrganizerDashboardBoxOfficePublicSale } from "#src/organizer/dashboard/boxoffice/convex/organizerDashboardBoxOfficeSaleSettle.ts"

/**
 * Guest purchase page state (mobile, anonymous). Subscribes to the public
 * sale query live without a session token; the ONLY payment offered here is
 * the explicit TEST-harness device simulation on test sales. Real payment
 * happens at the cash desk via a paid order + atomic check-in.
 */
export function abendkasseGastPageStateCreate(inputs: { saleId: () => string }) {
  const client = useContext(convexClientContext)
  const sale = createSignalObject<Result<OrganizerDashboardBoxOfficePublicSale> | undefined>(undefined)
  const busy = createSignalObject(false)
  const message = createSignalObject("")
  let subscriptionId = 0

  createRenderEffect(() => {
    const currentId = ++subscriptionId
    sale.set(undefined)
    message.set("")
    const saleId = inputs.saleId()
    if (!saleId || !client) {
      if (!client) sale.set(createResultError("abendkasseGast", "Keine Verbindung."))
      return
    }
    let unsubscribe: () => void = () => undefined
    try {
      unsubscribe = client.onUpdate(
        api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSalePublicGetQuery,
        { saleId: saleId as Id<"organizerDashboardBoxOfficeSales"> },
        (next) => {
          if (currentId !== subscriptionId) return
          sale.set(next)
        },
        (error) => {
          if (currentId !== subscriptionId) return
          sale.set(createResultError("abendkasseGast", error.message))
        },
      )
    } catch (error) {
      sale.set(createResultError("abendkasseGast", error instanceof Error ? error.message : String(error)))
    }
    onCleanup(() => {
      if (currentId === subscriptionId) subscriptionId += 1
      unsubscribe()
    })
  })

  const testPay = async () => {
    if (!client || busy.get()) return
    busy.set(true)
    message.set("")
    try {
      const result = await client.mutation(
        api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSaleTestDevicePayMutation,
        { saleId: inputs.saleId() as Id<"organizerDashboardBoxOfficeSales">, testHarness: true as const },
      )
      message.set(result.success ? "TEST-Zahlung simuliert — kein echter Kauf." : result.errorMessage)
    } catch (error) {
      message.set(error instanceof Error ? error.message : String(error))
    } finally {
      busy.set(false)
    }
  }

  return {
    sale: sale.get,
    busy: busy.get,
    message: message.get,
    testPay: () => void testPay(),
  }
}

export type AbendkasseGastPageState = ReturnType<typeof abendkasseGastPageStateCreate>
