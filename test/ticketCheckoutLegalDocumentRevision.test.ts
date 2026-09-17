import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { ticketCheckoutLegalDocumentRevision } from "../src/ticketing/ticketCheckoutLegalDocumentRevision.ts"
import { ticketCheckoutLegalDocumentSnapshot } from "../src/ticketing/ticketCheckoutLegalDocumentSnapshot.ts"

test("uses the deterministic revision of the accepted checkout legal Markdown bodies", async () => {
  const bodyRead = async (path: string) =>
    (await readFile(new URL(path, import.meta.url), "utf8")).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "").trim()
  const canonicalSnapshot = JSON.stringify({
    termsMarkdown: await bodyRead("../src/legal/agb.md"),
    privacyMarkdown: await bodyRead("../src/legal/datenschutz.md"),
  })
  const digest = createHash("sha256").update(canonicalSnapshot, "utf8").digest("hex")

  expect(ticketCheckoutLegalDocumentRevision).toBe(`sha256:${digest}`)
  expect(ticketCheckoutLegalDocumentSnapshot).toEqual({
    termsMarkdown: await bodyRead("../src/legal/agb.md"),
    privacyMarkdown: await bodyRead("../src/legal/datenschutz.md"),
  })
})
