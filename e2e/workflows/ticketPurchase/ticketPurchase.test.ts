import { expect } from "@rstest/playwright"
import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { e2eTicketTargetCheck } from "../../config/e2eTicketTargetCheck.ts"
import { ticketE2eAdminSignIn } from "../ticketE2eAdminSignIn.ts"
import { ticketPurchaseAccessStep } from "./ticketPurchaseAccessStep.ts"
import { ticketPurchaseCheckinStep } from "./ticketPurchaseCheckinStep.ts"
import { ticketPurchaseCheckoutStep } from "./ticketPurchaseCheckoutStep.ts"
import { ticketPurchaseContextCreate } from "./ticketPurchaseContextCreate.ts"
import { ticketPurchaseDeliveryStep } from "./ticketPurchaseDeliveryStep.ts"
import { ticketPurchaseDuplicateStep } from "./ticketPurchaseDuplicateStep.ts"
import { ticketPurchaseEventStep } from "./ticketPurchaseEventStep.ts"
import { ticketPurchasePaymentStep } from "./ticketPurchasePaymentStep.ts"
import { ticketPurchasePdfStep } from "./ticketPurchasePdfStep.ts"
import { ticketPurchaseProductStep } from "./ticketPurchaseProductStep.ts"
import { ticketPurchasePublicationStep } from "./ticketPurchasePublicationStep.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

const environment = e2eEnvironmentRead(process.env)
if (!environment.success) throw new Error(environment.errorMessage)
const guard = e2eTicketTargetCheck(environment.data.target)
if (!guard.success) throw new Error(guard.errorMessage)
test("testadmin can reach the real admin event catalog", { timeout: 90_000 }, async ({ page }) => {
  await ticketE2eAdminSignIn(page, environment.data.baseUrl)
  await expect(page.getByRole("heading", { name: /events/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("link", { name: /event erstellen|neues event/i })).toBeVisible()
})

test("creates, sells, delivers, opens, and checks in a paid ticket once", { timeout: 600_000 }, async ({
  page,
  browser,
  browserErrors,
}) => {
  const context = await ticketPurchaseContextCreate(page, browser, browserErrors)
  let primaryError: unknown
  let hasPrimaryError = false
  try {
    await ticketPurchaseEventStep(context)
    await ticketPurchaseProductStep(context)
    await ticketPurchasePublicationStep(context)
    await ticketPurchaseCheckoutStep(context)
    await ticketPurchasePaymentStep(context)
    await ticketPurchaseDeliveryStep(context)
    const code = await ticketPurchasePdfStep(context)
    await ticketPurchaseAccessStep(context)
    await ticketPurchaseCheckinStep(context, code)
    await ticketPurchaseDuplicateStep(context)
    await ticketPurchaseStepRun(context, "done", true, async () => {})
  } catch (error) {
    primaryError = error
    hasPrimaryError = true
  }
  if (context.guestContext) {
    try {
      await context.guestContext.close()
    } catch (closeError) {
      if (hasPrimaryError)
        throw new AggregateError([primaryError, closeError], "Ticket workflow and guest context cleanup both failed")
      throw closeError
    }
  }
  if (hasPrimaryError) throw primaryError
})
