import { describe, expect, test } from "bun:test"
import { adminEventsListQueryArgsCreate } from "./adminEventsListQueryArgsCreate.ts"
import { adminEventsSearchParse } from "./adminEventsSearchParse.ts"

describe("admin event lifecycle query selection", () => {
  test("current lists send only the supported archiveOnly argument, keeping filters local", () => {
    const search = adminEventsSearchParse({ q: "Konzert", status: "published", event: "concert", overview: "concert" })
    expect(adminEventsListQueryArgsCreate(search)).toEqual({ archiveOnly: false })
    expect(search).toMatchObject({ q: "Konzert", status: "published", event: "concert", overview: "concert" })
  })

  test("the archive icon opens only the archive and returning preserves current filters", () => {
    const search = adminEventsSearchParse({ q: "Konzert", status: "draft", event: "concert" })
    const archive = { ...search, archive: true }
    expect(adminEventsListQueryArgsCreate(archive)).toEqual({ archiveOnly: true })
    const returned = { ...archive, archive: false }
    expect(adminEventsListQueryArgsCreate(returned)).toEqual({ archiveOnly: false })
    expect(returned).toMatchObject({ q: "Konzert", status: "draft", event: "concert" })
  })

  test("legacy archive URLs select only archived events unless explicitly returned to current events", () => {
    for (const input of [{ showArchived: "true" }, { status: "archived" }, { archive: "true" }]) {
      const search = adminEventsSearchParse(input)
      expect(adminEventsListQueryArgsCreate(search)).toEqual({ archiveOnly: true })
      expect(adminEventsListQueryArgsCreate({ ...search, archive: false })).toEqual({ archiveOnly: false })
    }
  })

  test("invalid archive values cannot enable archive mode", () => {
    expect(adminEventsListQueryArgsCreate(adminEventsSearchParse({ archive: "yes", status: "invalid" }))).toEqual({
      archiveOnly: false,
    })
  })
})
