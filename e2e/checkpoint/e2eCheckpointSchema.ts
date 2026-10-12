import * as v from "valibot"

/** Target-bound evidence. Never store capability links, QR codes, card data or credentials. */
export const e2eSelectedWorkflowSchema = v.picklist([
  "SSO",
  "native auth HTTP",
  "native auth lifecycle",
  "ticket purchase",
])

export const e2eCheckpointSchema = v.strictObject({
  version: v.literal(1),
  target: v.picklist(["production", "development"]),
  baseUrl: v.picklist(["https://eventoren.de", "https://eventoren.leonardomora.de"]),
  runId: v.pipe(v.string(), v.regex(/^[0-9a-z]+-[0-9a-f-]{36}$/u)),
  createdAt: v.pipe(v.number(), v.integer(), v.minValue(1)),
  phase: v.picklist(["sso", "ticket-unreconciled"]),
  selectedWorkflows: v.optional(v.array(e2eSelectedWorkflowSchema)),
  completedWorkflows: v.optional(v.array(e2eSelectedWorkflowSchema)),
  cleanupPhase: v.optional(v.picklist(["pending", "failed"])),
  ticket: v.optional(
    v.strictObject({
      step: v.picklist([
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
      ]),
      status: v.picklist(["started", "completed"]),
      eventKey: v.pipe(v.string(), v.regex(/^ticket-e2e-[0-9a-z]+-[0-9a-f-]{36}$/u)),
      eventTitle: v.pipe(v.string(), v.regex(/^Ticket E2E [0-9a-z]+-[0-9a-f-]{36}$/u)),
      participantName: v.pipe(v.string(), v.regex(/^E2E Participant [0-9a-z]+-[0-9a-f-]{36}$/u)),
      mailSince: v.pipe(v.number(), v.integer(), v.minValue(1)),
      eventId: v.optional(v.string()),
      productId: v.optional(v.string()),
      orderId: v.optional(v.string()),
      ticketId: v.optional(v.string()),
      stripeSession: v.optional(v.pipe(v.string(), v.regex(/^cs_test_[A-Za-z0-9]+$/u))),
      mailUid: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
      mailUidValidity: v.optional(v.pipe(v.string(), v.regex(/^[1-9][0-9]*$/u))),
      pdfFilename: v.optional(v.string()),
      pdfSha256: v.optional(v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u))),
    }),
  ),
})

export type E2eCheckpoint = v.InferOutput<typeof e2eCheckpointSchema>
