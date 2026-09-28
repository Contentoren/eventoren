import { mkdir, mkdtemp, readdir, rm, symlink, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eTraceCleanup } from "./e2eTraceCleanup.ts"

describe("RSTest Playwright trace retention", () => {
  it("removes only direct-child trace directories whose full trees are older than 24 hours", async () => {
    const root = await mkdtemp(join(tmpdir(), "eventoren-traces-"))
    const now = Date.now()
    const oldTime = new Date(now - 25 * 60 * 60_000)
    try {
      const expired = join(root, ".rstest", "playwright-traces", "expired")
      const recentChild = join(root, ".rstest", "playwright-traces", "old-parent-recent-child")
      const sibling = join(root, ".rstest", "other-output")
      await mkdir(join(expired, "nested"), { recursive: true })
      await writeFile(join(expired, "nested", "trace.zip"), "old")
      await mkdir(join(recentChild, "nested"), { recursive: true })
      await writeFile(join(recentChild, "nested", "trace.zip"), "recent")
      await mkdir(sibling, { recursive: true })
      await writeFile(join(sibling, "keep.txt"), "keep")
      await utimes(join(expired, "nested", "trace.zip"), oldTime, oldTime)
      await utimes(join(expired, "nested"), oldTime, oldTime)
      await utimes(expired, oldTime, oldTime)
      await utimes(join(recentChild, "nested", "trace.zip"), new Date(now), new Date(now))
      await utimes(join(recentChild, "nested"), oldTime, oldTime)
      await utimes(recentChild, oldTime, oldTime)

      const result = await e2eTraceCleanup({ directory: root, now })

      expect(result).toEqual({ success: true, removed: ["expired"] })
      expect(await readdir(join(root, ".rstest", "playwright-traces"))).toEqual(["old-parent-recent-child"])
      expect(await readdir(sibling)).toEqual(["keep.txt"])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("leaves symlink trace entries untouched", async () => {
    const root = await mkdtemp(join(tmpdir(), "eventoren-traces-"))
    try {
      const traces = join(root, ".rstest", "playwright-traces")
      const outside = join(root, "outside")
      await mkdir(traces, { recursive: true })
      await mkdir(outside)
      await symlink(outside, join(traces, "linked"))
      expect(await e2eTraceCleanup({ directory: root })).toEqual({ success: true, removed: [] })
      expect(await readdir(traces)).toEqual(["linked"])
      expect(await readdir(outside)).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("retains trees with nested symlinks and entries exactly at the 24-hour boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "eventoren-traces-"))
    const now = Date.now()
    try {
      const traces = join(root, ".rstest", "playwright-traces")
      const linked = join(traces, "nested-link")
      const boundary = join(traces, "boundary")
      await mkdir(linked, { recursive: true })
      await mkdir(boundary)
      await symlink(boundary, join(linked, "link"))
      const oldTime = new Date(now - 25 * 60 * 60_000)
      await utimes(linked, oldTime, oldTime)
      await utimes(boundary, new Date(now - 24 * 60 * 60_000), new Date(now - 24 * 60 * 60_000))
      expect(await e2eTraceCleanup({ directory: root, now })).toEqual({ success: true, removed: [] })
      expect((await readdir(traces)).sort()).toEqual(["boundary", "nested-link"])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("rejects a symlinked .rstest parent without touching external traces", async () => {
    const root = await mkdtemp(join(tmpdir(), "eventoren-traces-"))
    const outside = await mkdtemp(join(tmpdir(), "eventoren-outside-"))
    try {
      await mkdir(join(outside, "playwright-traces", "stale"), { recursive: true })
      await symlink(outside, join(root, ".rstest"))
      const result = await e2eTraceCleanup({ directory: root })
      expect(result.success).toBe(false)
      expect(await readdir(join(outside, "playwright-traces"))).toEqual(["stale"])
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(outside, { recursive: true, force: true })
    }
  })
})
