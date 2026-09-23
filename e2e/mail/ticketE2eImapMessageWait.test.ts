import { expect, test } from "@rstest/core"
import { ticketE2eImapMessageWait } from "./ticketE2eImapMessageWait.ts"

test("expires an already elapsed IMAP polling deadline without opening a connection", async () => {
  await expect(
    ticketE2eImapMessageWait({
      host: "localhost",
      port: 993,
      user: "unused",
      password: "unused",
      purchaseMarker: "offline-fixture",
      since: new Date(),
      timeoutMs: 0,
      pollMs: 1,
      linkOrigin: "https://eventoren.test",
    }),
  ).rejects.toThrow("Timed out waiting for the ticket email matching the purchase marker")
})
