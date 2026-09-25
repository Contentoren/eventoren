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

test("reports failed IMAP attempts without leaking the mailbox address or password", async () => {
  const user = "secret-user@example.test"
  const password = "secret-password"
  const error = await ticketE2eImapMessageWait({
    host: "127.0.0.1",
    port: 1,
    user,
    password,
    purchaseMarker: "offline-fixture",
    since: new Date(),
    timeoutMs: 1_000,
    pollMs: 100,
    linkOrigin: "https://eventoren.test",
  }).catch((cause: unknown) => cause)

  expect(error).toBeInstanceOf(Error)
  expect((error as Error).message).toMatch(
    /mailbox read\/parse failed on all \d+ poll\(s\), last error code: ECONNREFUSED/u,
  )
  expect((error as Error).message).not.toContain(user)
  expect((error as Error).message).not.toContain(password)
})
