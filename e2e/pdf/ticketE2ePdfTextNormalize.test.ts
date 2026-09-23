import { expect, test } from "@rstest/core"
import { ticketE2ePdfTextNormalize } from "./ticketE2ePdfTextNormalize.ts"

test("joins wrapped identifier segments after hyphens and collapses normal whitespace", () => {
  expect(ticketE2ePdfTextNormalize("Ticket E2E muejo5qi-\nbd44de80-6482-495b-\n b882-5d606b68efda")).toBe(
    "Ticket E2E muejo5qi-bd44de80-6482-495b-b882-5d606b68efda",
  )
  expect(ticketE2ePdfTextNormalize("Ticket   E2E\nParticipant  Name")).toBe("Ticket E2E Participant Name")
})
