import { lstat, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Browser, Page } from "playwright"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointRootResolve } from "../../checkpoint/e2eCheckpointRootResolve.ts"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import type { BrowserErrorsCollector } from "../../config/BrowserErrorsCollector.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { e2eTicketTargetCheck } from "../../config/e2eTicketTargetCheck.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"

export async function ticketPurchaseContextCreate(
  page: Page,
  browser: Browser,
  browserErrors: BrowserErrorsCollector,
): Promise<TicketPurchaseContext> {
  const environment = e2eEnvironmentRead(process.env)
  if (!environment.success) throw new Error(environment.errorMessage)
  const guard = e2eTicketTargetCheck(environment.data.target)
  if (!guard.success) throw new Error(guard.errorMessage)
  const root = await e2eCheckpointRootResolve()
  if (!root.success) throw new Error(root.errorMessage)
  const loaded = await e2eCheckpointLoad(root.data.directory, environment.data)
  if (
    !loaded.success ||
    !loaded.data ||
    loaded.data.phase !== "ticket-unreconciled" ||
    loaded.data.runId !== process.env.E2E_RUN_ID
  )
    throw new Error("Ticket run has no matching runner checkpoint; refusing to start")
  const runId = loaded.data.runId
  // A legacy checkpoint with no evidence must not be upgraded: it may already have paid.
  if (!loaded.data.ticket) throw new Error("Legacy ticket checkpoint requires manual reconciliation")
  const ticket = loaded.data.ticket
  if (
    ticket.eventKey !== `ticket-e2e-${runId}` ||
    ticket.eventTitle !== `Ticket E2E ${runId}` ||
    ticket.participantName !== `E2E Participant ${runId}`
  )
    throw new Error("Ticket marker does not match the run")
  const mailcow = environment.data.mailcow
  const host = mailcow.TEST_CUSTOMER_MAILCOW_HOST?.trim()
  const user = mailcow.TEST_CUSTOMER_MAILCOW_USER?.trim()
  const password = mailcow.TEST_CUSTOMER_MAILCOW_PASS
  const port = Number(mailcow.TEST_CUSTOMER_MAILCOW_IMAP_PORT?.trim() || "993")
  if (!host || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Missing or invalid IMAP test mailbox settings")
  }
  // The parent owns this lock throughout SSO, checkpoint writes and the ticket child.
  try {
    const path = join(root.data.directory, "invocation.lock")
    const stat = await lstat(path)
    if (
      !stat.isFile() ||
      stat.uid !== process.getuid?.() ||
      (stat.mode & 0o077) !== 0 ||
      !process.env.E2E_INVOCATION_PID ||
      (await readFile(path, "utf8")) !== process.env.E2E_INVOCATION_PID
    )
      throw new Error("Invalid invocation lock")
  } catch {
    throw new Error("Ticket workflow requires the parent invocation lock; reconcile before retrying")
  }
  return {
    page,
    browser,
    baseUrl: environment.data.baseUrl,
    directory: root.data.directory,
    checkpoint: loaded.data as E2eCheckpoint & { ticket: NonNullable<E2eCheckpoint["ticket"]> },
    mail: { host, user, password, port },
    browserErrors,
  }
}
