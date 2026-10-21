import { afterAll, describe, expect, test } from "bun:test"
import { chmodSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { localRehearsalSnapshotCompare } from "./localRehearsalSnapshotCompare.ts"

const comparatorScript = new URL("./localRehearsalSnapshotCompare.py", import.meta.url).pathname
const scratch = mkdtempSync(join(tmpdir(), "snapshot-compare-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

type FixtureTable = ReadonlyArray<Record<string, unknown>>
type FixtureSpec = { tables: Record<string, FixtureTable>; meta: ReadonlyArray<{ name: string; id: number }> }

function writeFixtureZip(fileName: string, spec: FixtureSpec): string {
  const target = join(scratch, fileName)
  const build = Bun.spawnSync([
    "python3",
    "-c",
    "import json,sys,zipfile\n" +
      "target, spec = sys.argv[1], json.loads(sys.argv[2])\n" +
      "with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:\n" +
      "    for table, docs in spec['tables'].items():\n" +
      "        z.writestr(f'{table}/documents.jsonl', ''.join(json.dumps(d) + chr(10) for d in docs))\n" +
      "    z.writestr('_tables/documents.jsonl', ''.join(json.dumps(m) + chr(10) for m in spec['meta']))\n",
    target,
    JSON.stringify(spec),
  ])
  if (build.exitCode !== 0) throw new Error(`fixture build failed: ${build.stderr.toString()}`)
  chmodSync(target, 0o600)
  return target
}

const baseSpec: FixtureSpec = {
  tables: {
    users: [
      { _id: "u1", name: "Ada", role: "admin" },
      { _id: "u2", name: "Bo", role: "customer" },
    ],
    orgs: [{ _id: "o1", name: "Org", slug: "org" }],
  },
  meta: [
    { name: "users", id: 10001 },
    { name: "orgs", id: 10002 },
  ],
}

function compare(original: FixtureSpec, reexport: FixtureSpec, allowedEmptyTables: ReadonlyArray<string> = []) {
  const originalZip = writeFixtureZip(`orig-${Math.random().toString(36).slice(2)}.zip`, original)
  const reexportZip = writeFixtureZip(`live-${Math.random().toString(36).slice(2)}.zip`, reexport)
  return localRehearsalSnapshotCompare({ originalZip, reexportZip, allowedEmptyTables, comparatorScript })
}

describe("localRehearsalSnapshotCompare allowlist validation", () => {
  test("it refuses empty paths before running any comparison", () => {
    expect(
      localRehearsalSnapshotCompare({
        originalZip: "",
        reexportZip: "/x.zip",
        allowedEmptyTables: [],
        comparatorScript,
      }).success,
    ).toBe(false)
  })

  test("it refuses reserved, malformed, or duplicated allowlist names", () => {
    for (const allowedEmptyTables of [
      ["_tables"],
      ["_systemFoo"],
      ["_storageBar"],
      ["../escape"],
      ["a b"],
      ["dup", "dup"],
    ])
      expect(
        localRehearsalSnapshotCompare({
          originalZip: "/x.zip",
          reexportZip: "/y.zip",
          allowedEmptyTables,
          comparatorScript,
        }).success,
      ).toBe(false)
  })
})

describe("localRehearsalSnapshotCompare synthetic snapshot fixtures", () => {
  test("exact match passes with identical IDs and full record fields", () => {
    const result = compare(baseSpec, baseSpec)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tables).toBe(2)
      expect(result.data.docs).toBe(3)
    }
  })

  test("declared extra empty table with matching metadata passes", () => {
    const reexport: FixtureSpec = {
      tables: { ...baseSpec.tables, extraA: [] },
      meta: [...baseSpec.meta, { name: "extraA", id: 10003 }],
    }
    expect(compare(baseSpec, reexport, ["extraA"]).success).toBe(true)
  })

  test("allowlisted extra table carrying rows fails", () => {
    const reexport: FixtureSpec = {
      tables: { ...baseSpec.tables, extraA: [{ _id: "e1", note: "row" }] },
      meta: [...baseSpec.meta, { name: "extraA", id: 10003 }],
    }
    expect(compare(baseSpec, reexport, ["extraA"]).success).toBe(false)
  })

  test("missing carried table fails", () => {
    const reexport: FixtureSpec = { tables: { users: baseSpec.tables.users }, meta: baseSpec.meta }
    expect(compare(baseSpec, reexport).success).toBe(false)
  })

  test("mutated record field fails even when IDs match", () => {
    const reexport: FixtureSpec = {
      tables: {
        users: [
          { _id: "u1", name: "Ada", role: "customer" },
          { _id: "u2", name: "Bo", role: "customer" },
        ],
        orgs: baseSpec.tables.orgs,
      },
      meta: baseSpec.meta,
    }
    expect(compare(baseSpec, reexport).success).toBe(false)
  })

  test("renumbered metadata mapping fails", () => {
    const reexport: FixtureSpec = {
      tables: baseSpec.tables,
      meta: [
        { name: "users", id: 10001 },
        { name: "orgs", id: 99999 },
      ],
    }
    expect(compare(baseSpec, reexport).success).toBe(false)
  })

  test("unknown extra empty table fails without an allowlist entry", () => {
    const reexport: FixtureSpec = {
      tables: { ...baseSpec.tables, mystery: [] },
      meta: [...baseSpec.meta, { name: "mystery", id: 10003 }],
    }
    expect(compare(baseSpec, reexport).success).toBe(false)
  })

  test("group-readable snapshot input is refused", () => {
    const originalZip = writeFixtureZip("group-readable.zip", baseSpec)
    chmodSync(originalZip, 0o640)
    const reexportZip = writeFixtureZip("group-readable-live.zip", baseSpec)
    expect(
      localRehearsalSnapshotCompare({ originalZip, reexportZip, allowedEmptyTables: [], comparatorScript }).success,
    ).toBe(false)
  })
})
