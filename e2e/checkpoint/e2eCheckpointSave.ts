import { open, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { createResult, createResultError } from "#result"
import * as v from "valibot"
import { e2eCheckpointLoad } from "./e2eCheckpointLoad.ts"
import { e2eCheckpointSchema, type E2eCheckpoint } from "./e2eCheckpointSchema.ts"

const steps = [
  "ready",
  "event",
  "product",
  "publication",
  "checkout",
  "payment",
  "delivery",
  "pdf",
  "access",
  "checkin",
  "duplicate",
  "done",
] as const

export async function e2eCheckpointSave(directory: string, checkpoint: E2eCheckpoint) {
  const op = "e2eCheckpointSave"
  if (!v.safeParse(e2eCheckpointSchema, checkpoint).success) {
    return createResultError(op, "Invalid E2E checkpoint; no workflows started")
  }
  const existing = await e2eCheckpointLoad(directory, checkpoint)
  if (!existing.success) return existing
  const previous = existing.data
  if (previous) {
    if (previous.runId !== checkpoint.runId || previous.createdAt !== checkpoint.createdAt) {
      return createResultError(op, "Cannot overwrite another run or an unreconciled ticket attempt")
    }
    if (previous.phase === "ticket-unreconciled" && checkpoint.phase !== "ticket-unreconciled") {
      return createResultError(op, "Cannot overwrite another run or an unreconciled ticket attempt")
    }
    if (
      previous.ticket &&
      (!checkpoint.ticket ||
        steps.indexOf(checkpoint.ticket.step) < steps.indexOf(previous.ticket.step) ||
        steps.indexOf(checkpoint.ticket.step) > steps.indexOf(previous.ticket.step) + 1 ||
        (checkpoint.ticket.step === previous.ticket.step &&
          previous.ticket.status === "completed" &&
          checkpoint.ticket.status !== "completed") ||
        checkpoint.ticket.eventKey !== previous.ticket.eventKey ||
        checkpoint.ticket.eventTitle !== previous.ticket.eventTitle ||
        checkpoint.ticket.participantName !== previous.ticket.participantName ||
        checkpoint.ticket.mailSince !== previous.ticket.mailSince ||
        (
          [
            "eventId",
            "productId",
            "orderId",
            "ticketId",
            "stripeSession",
            "mailUid",
            "mailUidValidity",
            "pdfFilename",
            "pdfSha256",
          ] as const
        ).some((key) => previous.ticket![key] !== undefined && previous.ticket![key] !== checkpoint.ticket![key]))
    ) {
      return createResultError(op, "Cannot overwrite another run or an unreconciled ticket attempt")
    }
    const selectedGuard = e2eCheckpointSelectedGuard(previous, checkpoint)
    if (!selectedGuard.success) return createResultError(op, selectedGuard.errorMessage ?? "Invalid workflow barrier")
  } else {
    const freshGuard = e2eCheckpointSelectedGuard(undefined, checkpoint)
    if (!freshGuard.success) return createResultError(op, freshGuard.errorMessage ?? "Invalid workflow barrier")
  }
  const path = join(directory, "checkpoint.json")
  const temp = join(directory, `.${crypto.randomUUID()}.tmp`)
  try {
    const file = await open(temp, "wx", 0o600)
    try {
      await file.writeFile(JSON.stringify(checkpoint))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temp, path)
    return createResult(true)
  } catch {
    return createResultError(op, "Unable to persist E2E checkpoint; no further workflows started")
  } finally {
    await rm(temp, { force: true }).catch(() => {})
  }
}

function e2eCheckpointSelectedGuard(
  previous: E2eCheckpoint | null | undefined,
  next: E2eCheckpoint,
): { success: boolean; errorMessage?: string } {
  const selected = next.selectedWorkflows
  const completed = next.completedWorkflows ?? []
  const previousSelected = previous?.selectedWorkflows
  const previousCompleted = previous?.completedWorkflows ?? []
  if (previousSelected && !selected)
    return { success: false, errorMessage: "Cannot discard the selected workflow barrier" }
  if (previousSelected && selected && JSON.stringify(previousSelected) !== JSON.stringify(selected))
    return { success: false, errorMessage: "Cannot replace the selected workflow barrier mid-run" }
  if (selected) {
    for (const [index, name] of completed.entries()) {
      if (selected[index] !== name)
        return { success: false, errorMessage: "Completed workflows must extend the selected prefix in order" }
    }
    if (completed.length > selected.length)
      return { success: false, errorMessage: "Completed workflows must extend the selected prefix in order" }
  } else if (completed.length > 0) {
    return { success: false, errorMessage: "Completed workflows require a selected workflow barrier" }
  }
  if (previousCompleted.length > completed.length)
    return { success: false, errorMessage: "Completed workflows cannot be rewound" }
  for (const [index, name] of previousCompleted.entries()) {
    if (completed[index] !== name) return { success: false, errorMessage: "Completed workflows cannot be rewound" }
  }
  if (completed.length > previousCompleted.length + 1)
    return { success: false, errorMessage: "Workflows must complete one ordered step at a time" }
  const previousCleanup = previous?.cleanupPhase
  const nextCleanup = next.cleanupPhase
  if (previousCleanup && !nextCleanup)
    return { success: false, errorMessage: "Cannot discard the persisted cleanup phase" }
  if (!nextCleanup) return { success: true }
  if (!selected || completed.length !== selected.length || JSON.stringify(completed) !== JSON.stringify(selected))
    return { success: false, errorMessage: "Cleanup requires every selected workflow to succeed first" }
  if (
    selected.includes("ticket purchase") &&
    !(next.ticket && next.ticket.step === "done" && next.ticket.status === "completed")
  )
    return { success: false, errorMessage: "Cleanup requires the ticket workflow to reach done" }
  if (!previousCleanup && nextCleanup !== "pending")
    return { success: false, errorMessage: "Cleanup must start as pending after the success barrier" }
  if (previousCleanup === "pending" && nextCleanup !== "pending" && nextCleanup !== "failed")
    return { success: false, errorMessage: "Cannot discard the persisted cleanup phase" }
  if (previousCleanup === "failed" && nextCleanup !== "pending" && nextCleanup !== "failed")
    return { success: false, errorMessage: "Cannot discard the persisted cleanup phase" }
  return { success: true }
}
