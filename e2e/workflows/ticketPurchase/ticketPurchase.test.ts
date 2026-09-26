import { expect, test } from "@rstest/playwright"
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
}) => {
  const context = await ticketPurchaseContextCreate(page, browser)
  try {
    await ticketPurchaseEventStep(context)
    await ticketPurchaseProductStep(context)
    await ticketPurchasePublicationStep(context)
    await ticketPurchaseCheckoutStep(context)
    await ticketPurchasePaymentStep(context)
    await ticketPurchaseDeliveryStep(context)
    await ticketPurchasePdfStep(context)
    await ticketPurchaseAccessStep(context)
    await ticketPurchaseCheckinStep(context)
    await ticketPurchaseDuplicateStep(context)
  } finally {
    await context.guestContext?.close()
  }
})
