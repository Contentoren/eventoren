import { open, readdir, readFile, rename, rm, unlink } from "node:fs/promises"
import { join } from "node:path"
import { ConvexHttpClient } from "convex/browser"
import { createResult, createResultError } from "#result"
import { api } from "../../convex/_generated/api.js"
import { e2eSnapshotExportVerify } from "../catalog/e2eSnapshotExportVerify.ts"
import type {
  SnapshotActiveVerifyRead,
  SnapshotExportVerifyRead,
  SnapshotExportVerifyReadResult,
} from "../catalog/e2eSnapshotExportVerify.ts"
import { e2eAuthSessionCleanupRun } from "../auth/e2eAuthSessionCleanupRun.ts"
import { e2eCatalogCleanupRun } from "../catalog/e2eCatalogCleanupRun.ts"
import { e2eCatalogCleanupScan } from "../catalog/e2eCatalogCleanupScan.ts"
import { e2eHistoricalCleanupScan, e2eHistoricalStaleAfterMs } from "../catalog/e2eHistoricalCleanupScan.ts"
import { e2eHistoricalDiscoveryScan } from "../catalog/e2eHistoricalDiscoveryScan.ts"
import { e2eSnapshotCleanupScan } from "../catalog/e2eSnapshotCleanupScan.ts"
import { e2eSnapshotDiscoveryScan } from "../catalog/e2eSnapshotDiscoveryScan.ts"
import { e2eCheckpointLoad } from "../checkpoint/e2eCheckpointLoad.ts"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { nativeAuthHttpCheckpoint } from "../workflows/nativeAuth/nativeAuthHttpCheckpoint.ts"
import { ticketE2eImapCleanupScan } from "../mail/ticketE2eImapCleanupScan.ts"
import type { ticketE2eImapConfirmationDelete } from "../mail/ticketE2eImapConfirmationDelete.ts"
import { ticketE2eImapHistoricalCleanupScan } from "../mail/ticketE2eImapHistoricalCleanupScan.ts"
import { ticketE2eImapHistoricalVerify } from "../mail/ticketE2eImapHistoricalVerify.ts"
import { e2eStripeCleanupScan } from "../stripe/e2eStripeCleanupScan.ts"
import { e2eStripeHistoricalCleanupScan } from "../stripe/e2eStripeHistoricalCleanupScan.ts"
import { e2eStripeHistoricalVerify } from "../stripe/e2eStripeHistoricalVerify.ts"
import { e2eStripeTestClientCreate } from "../stripe/e2eStripeTestClientCreate.ts"
import type { e2eStripeTicketReconcile } from "../stripe/e2eStripeTicketReconcile.ts"

type HistoricalPageResult = { success: boolean; errorMessage?: string; data?: unknown }
type HistoricalPageFn = (args: {
  convexUrl: string
  adminToken: string
  cursor: string | null
  staleAfterMs: number
}) => Promise<HistoricalPageResult>

/**
 * Success-barrier cleanup: only after every selected workflow succeeded.
 * Never claim no-op success when the complete backend cleanup is absent:
 * historical catalog and orphan-order sweeps require an explicit Convex
 * URL/admin token, run with staleAfterMs 0 across every page (current, recent
 * and legacy ticket-e2e, native-auth, readiness and approved live
 * technical-checkout graphs) and must drain until isDone; truncated or
 * stalled pages fail and retain the cleanup phase. Skipped identifiable
 * candidates fail instead of being silently left behind; rows without any E2E
 * marker (for example a generic test title alone) are reported as retained
 * outside the ownership classification, never deleted.
 *
 * Crash-safe provider evidence: a read-only pre-deletion candidate inventory
 * is drained and persisted to the cleanup ledger BEFORE the first deletion
 * mutation, so a lost mutation response cannot orphan Stripe/IMAP evidence.
 * Provider candidates union the pre-discovery inventory, the returned deletion
 * receipts and prior-ledger evidence. A final global absence verification
 * pass (DB discovery plus provider disposable-resource checks) runs before
 * any checkpoint clearing; financial history and live objects are excluded
 * from the provider verification by design.
 *
 * Snapshot scope: derived catalog sync snapshots/chunks that still
 * denormalize fixture payload use the paged snapshot discovery/cleanup APIs
 * (never the bounded full-sweep historical mutation). A read-only
 * pre-deletion snapshot inventory is drained and merged into the cleanup
 * ledger BEFORE the first snapshot deletion, independent of the event
 * inventory because primary fixtures are already gone; the snapshot sweep
 * drains every page after the event-graph and provider checks, and a final
 * paged snapshot rediscovery must report zero test-bearing versions. An
 * affected active version is emptied for genuine rebuild and rescheduled by
 * the backend: the final check requires scheduler version coherence and a
 * clean current export (no fixture payload in the ready version). Snapshot
 * phases never skip when the event candidate inventory is empty, and
 * unproven snapshots fail with the checkpoint retained instead of being
 * deleted. Stripe financial history stays unrelated.
 *
 * Provider order is proof-before-deletion: the app order proof for the owned
 * current checkout is captured and persisted in a durable cleanup ledger
 * before any graph deletion, then reused for Stripe reconciliation after the
 * database rows are gone. Historical test-mode Stripe sessions and mail UIDs
 * are discovered by owned run marker from candidate metadata persisted in the
 * ledger before uncertain provider effects; live Stripe objects and financial
 * history (charges, invoices, payment intents) are never refunded or deleted.
 * Production never switches payment mode and never starts a paid fixture:
 * current-run purchase sweeps stay development-only via exact-run evidence.
 * Historical TEST provider reconciliation/verification runs on both targets
 * after catalog cleanup using persisted pre-deletion/old-ledger candidates;
 * prod historical TEST cleanup still excludes live financial history and
 * performs zero current purchases.
 */
export async function e2eSuccessCleanupRun(input: {
  directory: string
  target: Pick<E2eCheckpoint, "target" | "baseUrl">
  convexUrl?: string
  adminToken?: string
  now?: number
  catalogCleanup?: Parameters<typeof e2eCatalogCleanupScan>[0]["cleanup"]
  catalogHistoricalCleanup?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
    staleAfterMs?: number
  }) => Promise<HistoricalPageResult>
  orphanHistoricalCleanup?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
    staleAfterMs?: number
  }) => Promise<HistoricalPageResult>
  stripeReconcile?: typeof e2eStripeTicketReconcile
  stripeOrderProof?: Parameters<typeof e2eStripeTicketReconcile>[0]["orderProof"]
  stripeClient?: Parameters<typeof e2eStripeTicketReconcile>[0]["stripe"]
  stripeKey?: string
  stripeAccountId?: string
  stripeOrganizationId?: string
  customerExclusive?: Parameters<typeof e2eStripeTicketReconcile>[0]["customerExclusive"]
  historicalStripeCleanup?: (args: {
    candidates: { eventKey: string; runId?: string; kind?: string }[]
  }) => Promise<HistoricalPageResult>
  catalogHistoricalDiscovery?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
  }) => Promise<HistoricalPageResult>
  orphanHistoricalDiscovery?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
  }) => Promise<HistoricalPageResult>
  snapshotHistoricalDiscovery?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
  }) => Promise<HistoricalPageResult>
  snapshotHistoricalCleanup?: (args: {
    convexUrl: string
    adminToken: string
    cursor?: string | null
  }) => Promise<HistoricalPageResult>
  snapshotExportVerify?: (args: {
    activeVersion: number
    versions: { version: number; kind: string; eventKey: string }[]
  }) => Promise<HistoricalPageResult>
  snapshotExportRead?: (args: {
    version: number
    cursor: string | null
  }) => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>
  snapshotActiveRefresh?: () => Promise<{ success: boolean; errorMessage?: string; data?: unknown }>
  snapshotExportNow?: () => number
  snapshotExportSleep?: (ms: number) => Promise<void>
  snapshotExportDeadlineMs?: number
  snapshotExportPollIntervalMs?: number
  historicalStripeVerify?: (args: {
    candidates: { eventKey: string; runId?: string; kind?: string }[]
  }) => Promise<HistoricalPageResult>
  historicalMailVerify?: (args: {
    candidates: { eventKey: string; runId?: string; kind?: string }[]
  }) => Promise<HistoricalPageResult>
  historicalMailSearch?: (args: {
    candidate: { eventKey: string; runId?: string; kind?: string }
    eventTitle: string
    mail: NonNullable<typeof input.mail>
    baseUrl: string
  }) => Promise<{ success: boolean; errorMessage?: string; data?: { uid: number; uidValidity: string }[] }>
  mail?: { host: string; port: number; user: string; password: string }
  mailCleanup?: typeof ticketE2eImapConfirmationDelete
  historicalMailCleanup?: (args: {
    candidates: { eventKey: string; runId?: string; kind?: string }[]
  }) => Promise<HistoricalPageResult>
  authSessionDiscovery?: (args: { cursor: string | null }) => Promise<HistoricalPageResult>
  authSessionCleanup?: (args: { sessionIds: string[]; includeCallerSession: boolean }) => Promise<HistoricalPageResult>
  authSessionMark?: (args: { token: string; runId: string }) => Promise<HistoricalPageResult>
}) {
  const op = "e2eSuccessCleanupRun"
  const stored = await e2eCheckpointLoad(input.directory, input.target)
  if (!stored.success) return stored
  const checkpoint = stored.data
  if (!checkpoint) return createResultError(op, "No resumable run reached the success barrier; no cleanup performed")
  if (
    !checkpoint.selectedWorkflows ||
    !checkpoint.completedWorkflows ||
    checkpoint.completedWorkflows.length !== checkpoint.selectedWorkflows.length ||
    JSON.stringify(checkpoint.completedWorkflows) !== JSON.stringify(checkpoint.selectedWorkflows)
  )
    return createResultError(op, "Cleanup requires every selected workflow to succeed first; checkpoint retained")
  if (checkpoint.cleanupPhase !== "pending" && checkpoint.cleanupPhase !== "failed")
    return createResultError(op, "Cleanup requires a persisted pending phase; checkpoint retained")
  const selectedIncludesTicket = checkpoint.selectedWorkflows.includes("ticket purchase")
  if (selectedIncludesTicket) {
    const ticket = checkpoint.ticket
    if (!(ticket && ticket.step === "done" && ticket.status === "completed"))
      return createResultError(op, "Cleanup requires the ticket workflow to reach done; checkpoint retained")
  }
  const convexUrl = input.convexUrl?.trim()
  const adminToken = input.adminToken?.trim()
  if (!convexUrl || !adminToken)
    return createResultError(op, "Missing explicit E2E cleanup Convex URL/admin token; no-op success refused")

  const now = input.now ?? Date.now()
  const ledgerPath = e2eCleanupLedgerPath(input.directory, checkpoint.runId)
  const priorLedger = await e2eCleanupLedgerRead(ledgerPath, checkpoint.runId)

  const stripeConfig =
    input.stripeKey && input.stripeAccountId && input.stripeOrganizationId && input.stripeOrderProof
      ? {
          key: input.stripeKey,
          accountId: input.stripeAccountId,
          organizationId: input.stripeOrganizationId,
          orderProof: input.stripeOrderProof,
          stripe: input.stripeClient,
        }
      : undefined
  const needsCurrentProof = checkpoint.target !== "production" && selectedIncludesTicket && stripeConfig !== undefined

  let ledgerOrderProof = stripeConfig?.orderProof
  if (needsCurrentProof && stripeConfig && checkpoint.ticket?.orderId) {
    const ticket = checkpoint.ticket
    const orderId = ticket.orderId
    if (!orderId) return createResultError(op, "App order correlation could not be verified; checkpoint retained")
    try {
      const proof = await stripeConfig.orderProof(orderId, ticket.eventKey, checkpoint.runId, checkpoint.createdAt)
      if (!proof.success || !proof.data?.paymentReference || !proof.data.orderReference)
        return createResultError(op, "App order correlation could not be verified; checkpoint retained")
      const captured = proof
      ledgerOrderProof = (async () => captured) as typeof stripeConfig.orderProof
      const ledgerKept = await e2eCleanupLedgerWrite(ledgerPath, {
        version: 1 as const,
        runId: checkpoint.runId,
        target: checkpoint.target,
        createdAt: checkpoint.createdAt,
        ticketEvidence: {
          eventKey: ticket.eventKey,
          eventTitle: ticket.eventTitle,
          participantName: ticket.participantName,
          orderId: ticket.orderId,
          stripeSession: ticket.stripeSession,
          mailUid: ticket.mailUid,
          mailUidValidity: ticket.mailUidValidity,
          pdfFilename: ticket.pdfFilename,
          pdfSha256: ticket.pdfSha256,
        },
        orderProof: captured.data,
        priorHistorical: priorLedger?.historical ?? null,
        updatedAt: now,
      })
      if (!ledgerKept.success) return createResultError(op, `Cleanup ledger unavailable: ${ledgerKept.errorMessage}`)
    } catch {
      return createResultError(op, "App order proof unavailable; checkpoint retained")
    }
  } else {
    const ledgerKept = await e2eCleanupLedgerWrite(ledgerPath, {
      version: 1 as const,
      runId: checkpoint.runId,
      target: checkpoint.target,
      createdAt: checkpoint.createdAt,
      ticketEvidence: checkpoint.ticket
        ? {
            eventKey: checkpoint.ticket.eventKey,
            eventTitle: checkpoint.ticket.eventTitle,
            participantName: checkpoint.ticket.participantName,
            orderId: checkpoint.ticket.orderId,
            stripeSession: checkpoint.ticket.stripeSession,
            mailUid: checkpoint.ticket.mailUid,
            mailUidValidity: checkpoint.ticket.mailUidValidity,
            pdfFilename: checkpoint.ticket.pdfFilename,
            pdfSha256: checkpoint.ticket.pdfSha256,
          }
        : null,
      orderProof: null,
      priorHistorical: priorLedger?.historical ?? null,
      updatedAt: now,
    })
    if (!ledgerKept.success) return createResultError(op, `Cleanup ledger unavailable: ${ledgerKept.errorMessage}`)
  }

  const catalogCurrent = input.catalogCleanup
    ? await e2eCatalogCleanupScan({
        directory: input.directory,
        target: input.target,
        now,
        cleanup: input.catalogCleanup,
      })
    : await e2eCatalogCleanupRun({
        directory: input.directory,
        target: input.target,
        convexUrl,
        adminToken,
      })
  if (!catalogCurrent.success)
    return createResultError(op, `Owned catalog cleanup unresolved: ${catalogCurrent.errorMessage}`)
  if (catalogCurrent.data.status === "preserved-current-run")
    return createResultError(op, "Successful run must bypass the 24h catalog gate; checkpoint retained")

  const preDiscovery = await e2eSuccessPreDiscoveryDrain({
    convexUrl,
    adminToken,
    catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
    orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
  })
  if (!preDiscovery.success)
    return createResultError(op, `Historical pre-deletion inventory unresolved: ${preDiscovery.errorMessage}`)

  const ledgerPreKept = await e2eCleanupLedgerMerge(ledgerPath, { preHistoricalCandidates: preDiscovery.data })
  if (!ledgerPreKept.success) return createResultError(op, `Cleanup ledger unavailable: ${ledgerPreKept.errorMessage}`)

  const historical = await e2eSuccessHistoricalDrain({
    convexUrl,
    adminToken,
    catalogHistoricalCleanup: input.catalogHistoricalCleanup,
    orphanHistoricalCleanup: input.orphanHistoricalCleanup,
  })
  if (!historical.success)
    return createResultError(op, `Historical catalog sweep unresolved: ${historical.errorMessage}`)

  const ledgerHistoricalKept = await e2eCleanupLedgerMerge(ledgerPath, { historical: historical.data })
  if (!ledgerHistoricalKept.success)
    return createResultError(op, `Cleanup ledger unavailable: ${ledgerHistoricalKept.errorMessage}`)

  const historicalCandidates = e2eSuccessHistoricalCandidates(
    historical.data,
    priorLedger?.historical,
    preDiscovery.data,
    priorLedger?.preHistoricalCandidates,
  )
  const historicalProviders = await e2eSuccessHistoricalProvidersRun({
    directory: input.directory,
    runId: checkpoint.runId,
    candidates: historicalCandidates,
    organizationId: input.stripeOrganizationId,
    accountId: input.stripeAccountId,
    key: input.stripeKey,
    stripeClient: input.stripeClient,
    customerExclusive: input.customerExclusive,
    historicalStripeCleanup: input.historicalStripeCleanup,
    baseUrl: checkpoint.baseUrl,
    mail: input.mail,
    mailCleanup: input.mailCleanup,
    historicalMailCleanup: input.historicalMailCleanup,
  })
  if (!historicalProviders.success)
    return createResultError(op, `Historical provider cleanup unresolved: ${historicalProviders.errorMessage}`)

  if (checkpoint.target !== "production") {
    const stripe = await e2eStripeCleanupScan({
      directory: input.directory,
      target: input.target,
      now,
      reconcile:
        input.stripeReconcile ?? (await import("../stripe/e2eStripeTicketReconcile.ts")).e2eStripeTicketReconcile,
      config: stripeConfig && ledgerOrderProof ? { ...stripeConfig, orderProof: ledgerOrderProof } : undefined,
    })
    if (!stripe.success) return createResultError(op, `Owned Stripe TEST cleanup unresolved: ${stripe.errorMessage}`)
    if (stripe.data.status === "preserved-current-run")
      return createResultError(op, "Successful run must bypass the 24h Stripe gate; checkpoint retained")

    const mail = await ticketE2eImapCleanupScan({
      directory: input.directory,
      target: input.target,
      now,
      mail: input.mail,
      remove: input.mailCleanup,
    })
    if (!mail.success) return createResultError(op, `Owned IMAP cleanup unresolved: ${mail.errorMessage}`)
    if (mail.data.status === "preserved-current-run")
      return createResultError(op, "Successful run must bypass the 24h mail gate; checkpoint retained")

    const preSnapshots = await e2eSuccessSnapshotPreDiscoveryDrain({
      convexUrl,
      adminToken,
      snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
    })
    if (!preSnapshots.success)
      return createResultError(
        op,
        `Historical snapshot pre-deletion inventory unresolved: ${preSnapshots.errorMessage}`,
      )

    const ledgerSnapPreKept = await e2eCleanupLedgerMerge(ledgerPath, { preSnapshotCandidates: preSnapshots.data })
    if (!ledgerSnapPreKept.success)
      return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapPreKept.errorMessage}`)

    const snapshots = await e2eSuccessSnapshotCleanupDrain({
      convexUrl,
      adminToken,
      snapshotHistoricalCleanup: input.snapshotHistoricalCleanup,
    })
    if (!snapshots.success)
      return createResultError(op, `Historical snapshot sweep unresolved: ${snapshots.errorMessage}`)

    const ledgerSnapKept = await e2eCleanupLedgerMerge(ledgerPath, { snapshotHistorical: snapshots.data })
    if (!ledgerSnapKept.success)
      return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapKept.errorMessage}`)

    const snapshotFinal = await e2eSuccessSnapshotFinalVerify({
      convexUrl,
      adminToken,
      preActiveVersion: (preSnapshots.data as { activeVersion: number }).activeVersion,
      cleanupActiveVersion: (snapshots.data as { activeVersion: number }).activeVersion,
      cleanedVersions: (
        snapshots.data as {
          cleanedVersions: { version: number; kinds: string[]; eventKeys: string[]; action: string }[]
        }
      ).cleanedVersions,
      snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
      snapshotExportVerify: input.snapshotExportVerify,
      snapshotExportRead: input.snapshotExportRead,
      snapshotActiveRefresh: input.snapshotActiveRefresh,
      snapshotExportNow: input.snapshotExportNow,
      snapshotExportSleep: input.snapshotExportSleep,
      snapshotExportDeadlineMs: input.snapshotExportDeadlineMs,
      snapshotExportPollIntervalMs: input.snapshotExportPollIntervalMs,
    })
    if (!snapshotFinal.success)
      return createResultError(op, `Final snapshot absence verification unresolved: ${snapshotFinal.errorMessage}`)

    const ledgerSnapFinalKept = await e2eCleanupLedgerMerge(ledgerPath, { snapshotFinal: snapshotFinal.data })
    if (!ledgerSnapFinalKept.success)
      return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapFinalKept.errorMessage}`)

    const verified = await e2eSuccessFinalAbsenceVerify({
      convexUrl,
      adminToken,
      candidates: historicalCandidates,
      catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
      orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
      organizationId: input.stripeOrganizationId,
      accountId: input.stripeAccountId,
      key: input.stripeKey,
      stripeClient: input.stripeClient,
      historicalStripeVerify: input.historicalStripeVerify,
      baseUrl: checkpoint.baseUrl,
      mail: input.mail,
      historicalMailSearch: input.historicalMailSearch,
      historicalMailVerify: input.historicalMailVerify,
    })
    if (!verified.success)
      return createResultError(op, `Final absence verification unresolved: ${verified.errorMessage}`)

    const httpCheckpoint = await e2eSuccessHttpCheckpointRetire(input.directory, checkpoint)
    if (!httpCheckpoint.success) return httpCheckpoint

    const authSessions = await e2eSuccessAuthSessionPhaseRun(input, checkpoint.runId, convexUrl, adminToken)
    if (!authSessions.success) return authSessions

    const cleared = await e2eSuccessVerifiedCheckpointsClear(input.directory)
    if (!cleared.success) return createResultError(op, cleared.errorMessage ?? "Verified checkpoints retained")

    return createResult({
      catalog: catalogCurrent.data,
      historical: historical.data,
      preDiscovery: preDiscovery.data,
      preSnapshots: preSnapshots.data,
      snapshots: snapshots.data,
      snapshotFinal: snapshotFinal.data,
      stripe: stripe.data,
      mail: mail.data,
      historicalProviders: historicalProviders.data,
      finalAbsence: verified.data,
      httpCheckpoint: httpCheckpoint.data,
      authSessions: authSessions.data,
      ledger: ledgerPath,
      clearedOldCheckpoints: cleared.data,
    })
  }

  const preSnapshots = await e2eSuccessSnapshotPreDiscoveryDrain({
    convexUrl,
    adminToken,
    snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
  })
  if (!preSnapshots.success)
    return createResultError(op, `Historical snapshot pre-deletion inventory unresolved: ${preSnapshots.errorMessage}`)

  const ledgerSnapPreKept = await e2eCleanupLedgerMerge(ledgerPath, { preSnapshotCandidates: preSnapshots.data })
  if (!ledgerSnapPreKept.success)
    return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapPreKept.errorMessage}`)

  const snapshots = await e2eSuccessSnapshotCleanupDrain({
    convexUrl,
    adminToken,
    snapshotHistoricalCleanup: input.snapshotHistoricalCleanup,
  })
  if (!snapshots.success)
    return createResultError(op, `Historical snapshot sweep unresolved: ${snapshots.errorMessage}`)

  const ledgerSnapKept = await e2eCleanupLedgerMerge(ledgerPath, { snapshotHistorical: snapshots.data })
  if (!ledgerSnapKept.success)
    return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapKept.errorMessage}`)

  const snapshotFinal = await e2eSuccessSnapshotFinalVerify({
    convexUrl,
    adminToken,
    preActiveVersion: (preSnapshots.data as { activeVersion: number }).activeVersion,
    cleanupActiveVersion: (snapshots.data as { activeVersion: number }).activeVersion,
    cleanedVersions: (
      snapshots.data as { cleanedVersions: { version: number; kinds: string[]; eventKeys: string[]; action: string }[] }
    ).cleanedVersions,
    snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
    snapshotExportVerify: input.snapshotExportVerify,
    snapshotExportRead: input.snapshotExportRead,
    snapshotActiveRefresh: input.snapshotActiveRefresh,
    snapshotExportNow: input.snapshotExportNow,
    snapshotExportSleep: input.snapshotExportSleep,
    snapshotExportDeadlineMs: input.snapshotExportDeadlineMs,
    snapshotExportPollIntervalMs: input.snapshotExportPollIntervalMs,
  })
  if (!snapshotFinal.success)
    return createResultError(op, `Final snapshot absence verification unresolved: ${snapshotFinal.errorMessage}`)

  const ledgerSnapFinalKept = await e2eCleanupLedgerMerge(ledgerPath, { snapshotFinal: snapshotFinal.data })
  if (!ledgerSnapFinalKept.success)
    return createResultError(op, `Cleanup ledger unavailable: ${ledgerSnapFinalKept.errorMessage}`)

  const finalDb = await e2eSuccessFinalAbsenceVerify({
    convexUrl,
    adminToken,
    candidates: historicalCandidates,
    catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
    orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
    organizationId: input.stripeOrganizationId,
    accountId: input.stripeAccountId,
    key: input.stripeKey,
    stripeClient: input.stripeClient,
    historicalStripeVerify: input.historicalStripeVerify,
    baseUrl: checkpoint.baseUrl,
    mail: input.mail,
    historicalMailSearch: input.historicalMailSearch,
    historicalMailVerify: input.historicalMailVerify,
  })
  if (!finalDb.success) return createResultError(op, `Final absence verification unresolved: ${finalDb.errorMessage}`)

  const httpCheckpoint = await e2eSuccessHttpCheckpointRetire(input.directory, checkpoint)
  if (!httpCheckpoint.success) return httpCheckpoint

  const authSessions = await e2eSuccessAuthSessionPhaseRun(input, checkpoint.runId, convexUrl, adminToken)
  if (!authSessions.success) return authSessions

  const cleared = await e2eSuccessVerifiedCheckpointsClear(input.directory)
  if (!cleared.success) return createResultError(op, cleared.errorMessage ?? "Verified checkpoints retained")

  return createResult({
    catalog: catalogCurrent.data,
    historical: historical.data,
    preDiscovery: preDiscovery.data,
    preSnapshots: preSnapshots.data,
    snapshots: snapshots.data,
    snapshotFinal: snapshotFinal.data,
    stripe: { status: "no-fixture" as const },
    mail: { status: "no-fixture" as const },
    historicalProviders: historicalProviders.data,
    finalAbsence: finalDb.data,
    httpCheckpoint: httpCheckpoint.data,
    authSessions: authSessions.data,
    ledger: ledgerPath,
    clearedOldCheckpoints: cleared.data,
  })
}

/**
 * HTTP checkpoint retirement: runs only after the business/snapshot/provider
 * final absence is verified and before the caller auth/local evidence clear.
 * An absent file is already retired (idempotent no-op); corrupt, foreign or
 * mismatched state fails and retains the phase before any caller deletion.
 */
async function e2eSuccessHttpCheckpointRetire(
  directory: string,
  checkpoint: Pick<E2eCheckpoint, "target" | "baseUrl" | "runId">,
) {
  const op = "e2eSuccessCleanupRun"
  const retired = await nativeAuthHttpCheckpoint.retire(directory, {
    target: checkpoint.target,
    baseUrl: checkpoint.baseUrl,
    runId: checkpoint.runId,
  })
  if (!retired.success)
    return createResultError(op, `Verified HTTP checkpoint unresolved: ${retired.errorMessage}; checkpoint retained`)
  return createResult(retired.data)
}

/**
 * Auth-session phase: runs only after the catalog/provider final DB absence
 * is verified. Always drains backend marked history via the admin
 * query+cleanup, even with zero local evidence; only the owned-caller final
 * self phase is conditional on local run-evidence provenance. An externally
 * provided shared admin token stays unmarked and is never self-deleted.
 */
async function e2eSuccessAuthSessionPhaseRun(
  input: Parameters<typeof e2eSuccessCleanupRun>[0],
  runId: string,
  convexUrl: string,
  adminToken: string,
) {
  const op = "e2eSuccessCleanupRun"
  const sessions = await e2eAuthSessionCleanupRun({
    directory: input.directory,
    runId,
    convexUrl,
    adminToken,
    discovery: input.authSessionDiscovery,
    cleanup: input.authSessionCleanup,
    mark: input.authSessionMark,
  })
  if (!sessions.success) return createResultError(op, `Owned auth-session cleanup unresolved: ${sessions.errorMessage}`)
  return createResult(sessions.data)
}

async function e2eSuccessHistoricalDrain(input: {
  convexUrl: string
  adminToken: string
  catalogHistoricalCleanup?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalCleanup"]>
  orphanHistoricalCleanup?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalCleanup"]>
}) {
  if (input.catalogHistoricalCleanup) {
    const eventPage = (args: { cursor: string | null; staleAfterMs: number }) =>
      input.catalogHistoricalCleanup!({
        convexUrl: input.convexUrl,
        adminToken: input.adminToken,
        cursor: args.cursor,
        staleAfterMs: args.staleAfterMs,
      })
    const orphanPage = input.orphanHistoricalCleanup
      ? (args: { cursor: string | null; staleAfterMs: number }) =>
          input.orphanHistoricalCleanup!({
            convexUrl: input.convexUrl,
            adminToken: input.adminToken,
            cursor: args.cursor,
            staleAfterMs: args.staleAfterMs,
          })
      : undefined
    return e2eHistoricalCleanupScan({ staleAfterMs: e2eHistoricalStaleAfterMs, eventPage, orphanPage })
  }
  const client = new ConvexHttpClient(input.convexUrl)
  return e2eHistoricalCleanupScan({
    staleAfterMs: e2eHistoricalStaleAfterMs,
    eventPage: async (args) => {
      try {
        return await client.mutation(api.catalog.catalogE2eHistoricalCleanupMutation, {
          token: input.adminToken,
          staleAfterMs: args.staleAfterMs,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError("e2eSuccessCleanupRun", "Historical catalog cleanup unavailable; checkpoint retained")
      }
    },
    orphanPage: async (args) => {
      try {
        return await client.mutation(api.catalog.catalogE2eHistoricalOrphanOrderCleanupMutation, {
          token: input.adminToken,
          staleAfterMs: args.staleAfterMs,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError(
          "e2eSuccessCleanupRun",
          "Historical orphan-order cleanup unavailable; checkpoint retained",
        )
      }
    },
  })
}

function e2eSuccessHistoricalCandidates(
  historical: unknown,
  priorHistorical: unknown,
  preDiscovery?: unknown,
  priorPreDiscovery?: unknown,
): { eventKey: string; runId?: string; kind?: string }[] {
  const seen = new Map<string, { eventKey: string; runId?: string; kind?: string }>()
  for (const source of [historical, priorHistorical, preDiscovery, priorPreDiscovery])
    for (const entry of e2eSuccessCandidateEntries(source)) {
      if (seen.has(entry.eventKey)) continue
      seen.set(entry.eventKey, entry)
    }
  return [...seen.values()]
}

function e2eSuccessCandidateEntries(source: unknown): { eventKey: string; runId?: string; kind?: string }[] {
  if (typeof source !== "object" || source === null) return []
  if (!("cleaned" in source) && !("candidates" in source)) return []
  const record = source as Record<string, unknown>
  const entries: { eventKey: string; runId?: string; kind?: string }[] = []
  for (const key of ["cleaned", "candidates"] as const) {
    const list = record[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      if (typeof item !== "object" || item === null) continue
      const itemRecord = item as Record<string, unknown>
      const eventKey = itemRecord["eventKey"]
      if (typeof eventKey !== "string" || eventKey.length === 0) continue
      const runId = itemRecord["runId"]
      const kind = itemRecord["kind"]
      entries.push({
        eventKey,
        ...(typeof runId === "string" ? { runId } : {}),
        ...(typeof kind === "string" ? { kind } : {}),
      })
    }
  }
  return entries
}

async function e2eSuccessPreDiscoveryDrain(input: {
  convexUrl: string
  adminToken: string
  catalogHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalDiscovery"]>
  orphanHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalDiscovery"]>
}) {
  if (input.catalogHistoricalDiscovery) {
    const eventPage = (args: { cursor: string | null }) =>
      input.catalogHistoricalDiscovery!({
        convexUrl: input.convexUrl,
        adminToken: input.adminToken,
        cursor: args.cursor,
      })
    const orphanPage = input.orphanHistoricalDiscovery
      ? (args: { cursor: string | null }) =>
          input.orphanHistoricalDiscovery!({
            convexUrl: input.convexUrl,
            adminToken: input.adminToken,
            cursor: args.cursor,
          })
      : undefined
    return e2eHistoricalDiscoveryScan({ eventPage, orphanPage })
  }
  const client = new ConvexHttpClient(input.convexUrl)
  return e2eHistoricalDiscoveryScan({
    eventPage: async (args) => {
      try {
        return await client.query(api.catalog.catalogE2eHistoricalDiscoveryQuery, {
          token: input.adminToken,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError(
          "e2eSuccessCleanupRun",
          "Historical pre-deletion inventory unavailable; checkpoint retained",
        )
      }
    },
    orphanPage: async (args) => {
      try {
        return await client.query(api.catalog.catalogE2eHistoricalOrphanDiscoveryQuery, {
          token: input.adminToken,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError("e2eSuccessCleanupRun", "Historical orphan inventory unavailable; checkpoint retained")
      }
    },
  })
}

async function e2eSuccessFinalDbVerify(input: {
  convexUrl: string
  adminToken: string
  catalogHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalDiscovery"]>
  orphanHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalDiscovery"]>
}) {
  const op = "e2eSuccessCleanupRun"
  const discovered = await e2eSuccessPreDiscoveryDrain({
    convexUrl: input.convexUrl,
    adminToken: input.adminToken,
    catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
    orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
  })
  if (!discovered.success) return discovered
  const remaining = (discovered.data as { candidates?: unknown[] }).candidates ?? []
  if (remaining.length > 0)
    return createResultError(op, "Final DB verification retains fixture candidates; checkpoint retained")
  return createResult({ status: "db-historical-absent" as const })
}

async function e2eSuccessSnapshotPreDiscoveryDrain(input: {
  convexUrl: string
  adminToken: string
  snapshotHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotHistoricalDiscovery"]>
}) {
  if (input.snapshotHistoricalDiscovery) {
    const snapshotPage = (args: { cursor: string | null }) =>
      input.snapshotHistoricalDiscovery!({
        convexUrl: input.convexUrl,
        adminToken: input.adminToken,
        cursor: args.cursor,
      })
    return e2eSnapshotDiscoveryScan({ snapshotPage })
  }
  const client = new ConvexHttpClient(input.convexUrl)
  return e2eSnapshotDiscoveryScan({
    snapshotPage: async (args) => {
      try {
        return await client.query(api.catalog.catalogE2eSnapshotHistoricalDiscoveryQuery, {
          token: input.adminToken,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError(
          "e2eSuccessCleanupRun",
          "Historical snapshot pre-deletion inventory unavailable; checkpoint retained",
        )
      }
    },
  })
}

async function e2eSuccessSnapshotCleanupDrain(input: {
  convexUrl: string
  adminToken: string
  snapshotHistoricalCleanup?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotHistoricalCleanup"]>
}) {
  if (input.snapshotHistoricalCleanup) {
    const snapshotPage = (args: { cursor: string | null }) =>
      input.snapshotHistoricalCleanup!({
        convexUrl: input.convexUrl,
        adminToken: input.adminToken,
        cursor: args.cursor,
      })
    return e2eSnapshotCleanupScan({ snapshotPage })
  }
  const client = new ConvexHttpClient(input.convexUrl)
  return e2eSnapshotCleanupScan({
    snapshotPage: async (args) => {
      try {
        return await client.mutation(api.catalog.catalogE2eSnapshotHistoricalCleanupMutation, {
          token: input.adminToken,
          cursor: args.cursor ?? undefined,
        })
      } catch {
        return createResultError("e2eSuccessCleanupRun", "Historical snapshot cleanup unavailable; checkpoint retained")
      }
    },
  })
}

async function e2eSuccessSnapshotFinalVerify(input: {
  convexUrl: string
  adminToken: string
  preActiveVersion: number
  cleanupActiveVersion: number
  cleanedVersions: { version: number; kinds: string[]; eventKeys: string[]; action: string }[]
  snapshotHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotHistoricalDiscovery"]>
  snapshotExportVerify?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotExportVerify"]>
  snapshotExportRead?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotExportRead"]>
  snapshotActiveRefresh?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["snapshotActiveRefresh"]>
  snapshotExportNow?: () => number
  snapshotExportSleep?: (ms: number) => Promise<void>
  snapshotExportDeadlineMs?: number
  snapshotExportPollIntervalMs?: number
}) {
  const op = "e2eSuccessCleanupRun"
  // The active scheduler version may legitimately advance while an affected
  // active snapshot is emptied for genuine rebuild and rescheduled, or while
  // the catalog naturally advances. Version equality alone never proves
  // absence, and a moved version is not a permanent failure: retry the whole
  // rediscovery a finite number of times, then verify the full current ready
  // export below.
  const maxVerifyAttempts = 3
  let rediscovered: { success: boolean; errorMessage?: string; data?: unknown } | null = null
  for (let attempt = 1; attempt <= maxVerifyAttempts; attempt += 1) {
    const drained = await e2eSuccessSnapshotPreDiscoveryDrain({
      convexUrl: input.convexUrl,
      adminToken: input.adminToken,
      snapshotHistoricalDiscovery: input.snapshotHistoricalDiscovery,
    })
    if (!drained.success) {
      const moved = typeof drained.errorMessage === "string" && drained.errorMessage.includes("version moved")
      if (moved && attempt < maxVerifyAttempts) continue
      return drained
    }
    rediscovered = drained
    break
  }
  if (!rediscovered?.success) return rediscovered ?? createResultError(op, "Final snapshot verification unavailable")
  const finalData = rediscovered.data as {
    candidates?: { version: number; kind: string; eventKey: string }[]
    activeVersion: number
  }
  const remaining = finalData.candidates ?? []
  if (remaining.length > 0)
    return createResultError(op, "Final snapshot verification retains test-bearing versions; checkpoint retained")
  const rebuilt = input.cleanedVersions.filter((entry) => entry.action === "rebuilt")
  if (rebuilt.length === 0)
    return createResult({
      status: "snapshot-historical-absent" as const,
      activeVersion: finalData.activeVersion,
      preActiveVersion: input.preActiveVersion,
      cleanupActiveVersion: input.cleanupActiveVersion,
    })
  if (input.snapshotExportVerify && !input.snapshotExportRead) {
    const verified = await input.snapshotExportVerify({
      activeVersion: finalData.activeVersion,
      versions: rebuilt.map((entry) => ({
        version: entry.version,
        kind: entry.kinds[0] ?? "ticket-e2e",
        eventKey: entry.eventKeys[0] ?? "",
      })),
    })
    if (!verified.success) return verified
    return createResult({
      status: "snapshot-export-clean" as const,
      activeVersion: finalData.activeVersion,
      preActiveVersion: input.preActiveVersion,
      cleanupActiveVersion: input.cleanupActiveVersion,
      export: verified.data,
    })
  }
  const exportRead: SnapshotExportVerifyRead = input.snapshotExportRead
    ? async (args): Promise<SnapshotExportVerifyReadResult> => {
        const result = await input.snapshotExportRead!({ version: args.version, cursor: args.cursor })
        if (!result.success)
          return {
            success: false,
            errorMessage: result.errorMessage ?? "Snapshot export unavailable; checkpoint retained",
          }
        const data = result.data as
          | { version: unknown; events: unknown; isDone: unknown; continueCursor: unknown }
          | null
          | undefined
        if (data === null || data === undefined) return { success: true, data: null }
        if (typeof data !== "object" || Array.isArray(data))
          return { success: false, errorMessage: "Snapshot export unavailable; checkpoint retained" }
        if (
          typeof data.version !== "number" ||
          !Array.isArray(data.events) ||
          typeof data.isDone !== "boolean" ||
          (data.isDone !== true && typeof data.continueCursor !== "string" && data.continueCursor !== null)
        )
          return { success: false, errorMessage: "Snapshot export unavailable; checkpoint retained" }
        const events: Record<string, unknown>[] = []
        for (const event of data.events) {
          if (typeof event !== "object" || event === null || Array.isArray(event))
            return { success: false, errorMessage: "Snapshot export unavailable; checkpoint retained" }
          events.push(event as Record<string, unknown>)
        }
        return {
          success: true,
          data: {
            version: data.version,
            events,
            isDone: data.isDone,
            continueCursor: data.isDone ? null : ((data.continueCursor as string | null) ?? null),
          },
        }
      }
    : async (args): Promise<SnapshotExportVerifyReadResult> => {
        const client = new ConvexHttpClient(input.convexUrl)
        try {
          const exported = await client.query(api.catalog.catalogE2eSnapshotExportQuery, {
            token: input.adminToken,
            requestedVersion: args.version,
            ...(args.cursor ? { cursor: args.cursor } : {}),
          })
          if (!exported.success)
            return {
              success: false,
              errorMessage: exported.errorMessage ?? "Snapshot export unavailable; checkpoint retained",
            }
          const page = exported.data
          if (page === null || page === undefined) return { success: true, data: null }
          if (
            typeof page !== "object" ||
            Array.isArray(page) ||
            typeof (page as { catalogVersion?: unknown }).catalogVersion !== "number" ||
            !Array.isArray((page as { events?: unknown }).events) ||
            typeof (page as { isDone?: unknown }).isDone !== "boolean" ||
            ((page as { isDone: boolean }).isDone !== true &&
              typeof (page as { continueCursor?: unknown }).continueCursor !== "string")
          )
            return { success: false, errorMessage: "Snapshot export unavailable; checkpoint retained" }
          const typed = page as {
            catalogVersion: number
            events: readonly Record<string, unknown>[]
            isDone: boolean
            continueCursor: string
          }
          return {
            success: true,
            data: {
              version: typed.catalogVersion,
              events: [...typed.events],
              isDone: typed.isDone,
              continueCursor: typed.isDone ? null : typed.continueCursor,
            },
          }
        } catch {
          return { success: false, errorMessage: "Snapshot export unavailable; checkpoint retained" }
        }
      }
  const activeRefresh: SnapshotActiveVerifyRead = input.snapshotActiveRefresh
    ? async () => {
        const result = await input.snapshotActiveRefresh!()
        if (!result.success) return { success: false, errorMessage: result.errorMessage ?? "unknown" }
        if (typeof result.data !== "number")
          return { success: false, errorMessage: "Snapshot active version unavailable; checkpoint retained" }
        return { success: true, data: result.data }
      }
    : async () => {
        const client = new ConvexHttpClient(input.convexUrl)
        try {
          const first = await client.query(api.catalog.catalogE2eSnapshotHistoricalDiscoveryQuery, {
            token: input.adminToken,
          })
          if (!first.success)
            return {
              success: false,
              errorMessage: first.errorMessage ?? "Snapshot active version unavailable; checkpoint retained",
            }
          const activeVersion = (first.data as { activeVersion?: unknown } | null | undefined)?.activeVersion
          if (typeof activeVersion !== "number")
            return { success: false, errorMessage: "Snapshot active version unavailable; checkpoint retained" }
          return { success: true, data: activeVersion }
        } catch {
          return { success: false, errorMessage: "Snapshot active version unavailable; checkpoint retained" }
        }
      }
  const verified = await e2eSnapshotExportVerify({
    activeVersion: finalData.activeVersion,
    readExportPage: exportRead,
    readActiveVersion: activeRefresh,
    ...(input.snapshotExportNow ? { now: input.snapshotExportNow } : {}),
    ...(input.snapshotExportSleep ? { sleep: input.snapshotExportSleep } : {}),
    ...(typeof input.snapshotExportDeadlineMs === "number" ? { deadlineMs: input.snapshotExportDeadlineMs } : {}),
    ...(typeof input.snapshotExportPollIntervalMs === "number"
      ? { pollIntervalMs: input.snapshotExportPollIntervalMs }
      : {}),
  })
  if (!verified.success) return verified
  return createResult({
    status: "snapshot-export-clean" as const,
    activeVersion: (verified.data as { activeVersion: number }).activeVersion,
    preActiveVersion: input.preActiveVersion,
    cleanupActiveVersion: input.cleanupActiveVersion,
    export: verified.data,
  })
}

/**
 * Final absence always runs provider verification, even with zero DB
 * candidates. With valid TEST Stripe key/account/organization the Stripe
 * verifier performs global owned-TEST discovery (live objects and financial
 * history excluded by design, never refunded/deleted); without credentials
 * and no proven TEST keys it legitimately reports absent/no-fixture, which
 * documents an unverified provider inventory rather than a proven global
 * zero when a provider is configured as required. IMAP verification uses the
 * configured exact-marker search only and never performs a recipient-wide
 * purge.
 */
async function e2eSuccessFinalAbsenceVerify(input: {
  convexUrl: string
  adminToken: string
  candidates: { eventKey: string; runId?: string; kind?: string }[]
  catalogHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["catalogHistoricalDiscovery"]>
  orphanHistoricalDiscovery?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["orphanHistoricalDiscovery"]>
  organizationId?: string
  accountId?: string
  key?: string
  stripeClient?: Parameters<typeof e2eStripeTicketReconcile>[0]["stripe"]
  historicalStripeVerify?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["historicalStripeVerify"]>
  baseUrl: string
  mail?: { host: string; port: number; user: string; password: string }
  historicalMailSearch?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailSearch"]>
  historicalMailVerify?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailVerify"]>
}) {
  const db = await e2eSuccessFinalDbVerify({
    convexUrl: input.convexUrl,
    adminToken: input.adminToken,
    catalogHistoricalDiscovery: input.catalogHistoricalDiscovery,
    orphanHistoricalDiscovery: input.orphanHistoricalDiscovery,
  })
  if (!db.success) return db

  const stripe = input.historicalStripeVerify
    ? await input.historicalStripeVerify({ candidates: input.candidates })
    : await e2eStripeHistoricalVerify({
        candidates: input.candidates,
        organizationId: input.organizationId ?? "",
        accountId: input.accountId ?? "",
        key: input.key ?? "",
        stripe: input.stripeClient ?? e2eStripeTestClientCreate(input.key ?? ""),
      })
  if (!stripe.success) return stripe

  const mail = input.historicalMailVerify
    ? await input.historicalMailVerify({ candidates: input.candidates })
    : await ticketE2eImapHistoricalVerify({
        candidates: input.candidates,
        baseUrl: input.baseUrl,
        mail: input.mail,
        search: input.historicalMailSearch,
      })
  if (!mail.success) return mail

  return createResult({ db: db.data, stripe: stripe.data, mail: mail.data })
}

/**
 * Historical providers always run, even with zero DB/ledger candidates. With
 * valid TEST Stripe key/account/organization the cleanup scan performs global
 * owned-TEST discovery (open TEST sessions expired, TEST subscriptions
 * canceled, proof-exclusive TEST customers deleted; live history untouched,
 * no refunds/financial deletes); without credentials and no proven TEST keys
 * it legitimately reports no-fixture, which is an unverified inventory rather
 * than a false global zero when a provider is required. IMAP cleanup uses the
 * configured exact-marker search only (exact event title, capability link and
 * PDF attachment) and never performs a recipient-wide purge.
 */
async function e2eSuccessHistoricalProvidersRun(input: {
  directory: string
  runId: string
  candidates: { eventKey: string; runId?: string; kind?: string }[]
  organizationId?: string
  accountId?: string
  key?: string
  stripeClient?: Parameters<typeof e2eStripeTicketReconcile>[0]["stripe"]
  customerExclusive?: Parameters<typeof e2eStripeTicketReconcile>[0]["customerExclusive"]
  historicalStripeCleanup?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["historicalStripeCleanup"]>
  baseUrl: string
  mail?: { host: string; port: number; user: string; password: string }
  mailCleanup?: typeof ticketE2eImapConfirmationDelete
  historicalMailCleanup?: NonNullable<Parameters<typeof e2eSuccessCleanupRun>[0]["historicalMailCleanup"]>
}) {
  const ledgerAppend = async (entry: unknown) =>
    e2eCleanupLedgerMerge(e2eCleanupLedgerPath(input.directory, input.runId), { providerEvidence: entry })

  const stripe = input.historicalStripeCleanup
    ? await input.historicalStripeCleanup({ candidates: input.candidates })
    : await e2eStripeHistoricalCleanupScan({
        candidates: input.candidates,
        organizationId: input.organizationId ?? "",
        accountId: input.accountId ?? "",
        key: input.key ?? "",
        stripe: input.stripeClient ?? e2eStripeTestClientCreate(input.key ?? ""),
        customerExclusive: input.customerExclusive,
        ledgerAppend,
      })
  if (!stripe.success) return stripe

  const mail = input.historicalMailCleanup
    ? await input.historicalMailCleanup({ candidates: input.candidates })
    : await ticketE2eImapHistoricalCleanupScan({
        candidates: input.candidates,
        baseUrl: input.baseUrl,
        mail: input.mail,
        remove: input.mailCleanup,
        ledgerAppend,
      })
  if (!mail.success) return mail

  return createResult({ stripe: stripe.data, mail: mail.data })
}

function e2eCleanupLedgerPath(directory: string, runId: string): string {
  return join(directory, `cleanup-ledger-${runId}.json`)
}

async function e2eCleanupLedgerRead(
  path: string,
  runId: string,
): Promise<{ runId?: string; historical?: unknown; preHistoricalCandidates?: unknown } | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"))
    if (typeof parsed !== "object" || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (record["runId"] !== runId) return null
    return {
      runId: typeof record["runId"] === "string" ? record["runId"] : undefined,
      historical: record["historical"],
      preHistoricalCandidates: record["preHistoricalCandidates"],
    }
  } catch {
    return null
  }
}

async function e2eCleanupLedgerWrite(path: string, ledger: Record<string, unknown>) {
  try {
    const temp = `${path}.${crypto.randomUUID()}.tmp`
    const file = await open(temp, "wx", 0o600)
    try {
      await file.writeFile(JSON.stringify(ledger))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path)
    return createResult(true)
  } catch {
    return createResultError("e2eSuccessCleanupRun", "Unable to persist E2E cleanup ledger; checkpoint retained")
  }
}

async function e2eCleanupLedgerMerge(path: string, patch: Record<string, unknown>) {
  try {
    let current: Record<string, unknown> = {}
    try {
      current = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>
    } catch {
      current = {}
    }
    return await e2eCleanupLedgerWrite(path, { ...current, ...patch })
  } catch {
    return createResultError("e2eSuccessCleanupRun", "Unable to persist E2E cleanup ledger; checkpoint retained")
  }
}

/**
 * Remove verified old workflow checkpoints after absence is proven,
 * including data from older failed runs: the native-auth lifecycle draft
 * checkpoint and stale cleanup ledgers from previous runs. The main
 * checkpoint.json removal stays with the invocation runner.
 */
async function e2eSuccessVerifiedCheckpointsClear(directory: string) {
  const op = "e2eSuccessCleanupRun"
  const cleared: string[] = []
  try {
    const entries = await readdir(directory)
    const staleLedgers = entries.filter((entry) => entry.startsWith("cleanup-ledger-") && entry.endsWith(".json"))
    for (const entry of [...staleLedgers, "native-auth-lifecycle-checkpoint.json"]) {
      try {
        await unlink(join(directory, entry))
        cleared.push(entry)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
          return createResultError(op, `Verified checkpoint ${entry} could not be removed; reconcile it manually`)
      }
    }
    try {
      await rm(join(directory, "cleanup-ledger-current.json"), { force: true })
    } catch {
      // Best-effort legacy ledger name only.
    }
    return createResult(cleared)
  } catch {
    return createResultError(op, "Verified old workflow checkpoints could not be listed; reconcile manually")
  }
}
