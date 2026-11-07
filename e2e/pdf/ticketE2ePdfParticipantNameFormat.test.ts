import { expect, test } from "@rstest/core"
import { ticketE2ePdfParticipantNameFormat } from "./ticketE2ePdfParticipantNameFormat.ts"
import { ticketE2ePdfTextNormalize } from "./ticketE2ePdfTextNormalize.ts"

test("requires the full attendee name through the renderer's 40-character boundary", () => {
  for (const name of ["Lena Hoffmann", "A".repeat(40)]) {
    expect(ticketE2ePdfParticipantNameFormat(name)).toBe(name)
  }
  expect(ticketE2ePdfParticipantNameFormat("A".repeat(41))).toBe(`${"A".repeat(13)}…`)
})

test("matches the deliberately abbreviated attendee in the delivered E2E PDF", () => {
  const name = "E2E Participant mw4e63fx-f01e4e33-8f10-4219-8cf2-a5f1b926f5e7"
  const attendee = ticketE2ePdfParticipantNameFormat(name)
  expect(attendee).toBe("E2E Participa…")
  const text = ticketE2ePdfTextNormalize(
    "Ticketart Teilnehmer\nPaid ticket mw4e63fx-E2E Participa…\nf01e4e33-8f10-4219-8cf2-a5f1b926f5e7",
  )
  expect(text).toContain(attendee)
  expect(text).not.toContain(ticketE2ePdfParticipantNameFormat(`Wrong attendee ${name}`))
  expect(ticketE2ePdfTextNormalize("Ticketart Teilnehmer Paid ticket")).not.toContain(attendee)
})

test("counts Unicode code points and trims the abbreviated field like the renderer", () => {
  expect(ticketE2ePdfParticipantNameFormat("😀".repeat(40))).toBe("😀".repeat(40))
  expect(ticketE2ePdfParticipantNameFormat("😀".repeat(41))).toBe(`${"😀".repeat(13)}…`)
  expect(ticketE2ePdfParticipantNameFormat(`  ${"A".repeat(12)} ${"B".repeat(28)}`)).toBe(`${"A".repeat(12)}…`)
})
