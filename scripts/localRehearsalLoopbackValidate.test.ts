import { describe, expect, test } from "bun:test"
import { localRehearsalLoopbackValidate } from "../scripts/localRehearsalLoopbackValidate.ts"

describe("localRehearsalLoopbackValidate", () => {
  test("accepts the pinned local rehearsal origin with an explicit port", () => {
    const loopback = localRehearsalLoopbackValidate("http://127.0.0.1:13470")
    expect(loopback.success).toBe(true)
    if (loopback.success) {
      expect(loopback.data.origin).toBe("http://127.0.0.1:13470")
      expect(loopback.data.hostname).toBe("127.0.0.1")
      expect(loopback.data.port).toBe(13470)
    }
  })

  test("refuses external targets, missing ports, and embedded credentials", () => {
    for (const external of [
      "https://convex.eventoren.de",
      "https://eventoren-convex.wonder1.de",
      "http://169.254.1.2:3146",
      "http://localhost",
      "http://user:pass@127.0.0.1:13470",
      "ftp://127.0.0.1:21",
      "",
    ])
      expect(localRehearsalLoopbackValidate(external).success).toBe(false)
  })

  test("refuses localhost DNS and ipv6 spellings so only the literal 127.0.0.1 binds", () => {
    for (const dns of ["http://localhost:13470", "http://LOCALHOST:13470", "http://[::1]:13470", "http://::1:13470"])
      expect(localRehearsalLoopbackValidate(dns).success).toBe(false)
  })

  test("refuses shared preview and production ports even on loopback", () => {
    for (const port of [3210, 3211, 3234, 3235, 6791, 8320, 8321])
      expect(localRehearsalLoopbackValidate(`http://127.0.0.1:${port}`).success).toBe(false)
  })

  test("refuses https, paths, and query or fragment parts on the rehearsal target", () => {
    for (const target of [
      "https://127.0.0.1:13470",
      "http://127.0.0.1:13470/api",
      "http://127.0.0.1:13470?env=prod",
      "http://127.0.0.1:13470#frag",
    ])
      expect(localRehearsalLoopbackValidate(target).success).toBe(false)
  })

  test("refuses non-integer and out-of-range port overrides", () => {
    for (const target of [
      "http://127.0.0.1:abc",
      "http://127.0.0.1:0",
      "http://127.0.0.1:99999",
      "http://127.0.0.1:-1",
      "http://127.0.0.1:",
    ])
      expect(localRehearsalLoopbackValidate(target).success).toBe(false)
  })
})
