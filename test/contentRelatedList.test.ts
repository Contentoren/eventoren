import { expect, test } from "bun:test"
import { contentRelatedList } from "../src/app/content/contentRelatedList.ts"
import { contentListItemFixture } from "./contentViewStateHelpers.fixture.ts"

const current = contentListItemFixture("current", "abiball")

test("related articles prefer the same category and never include the current article", () => {
  const items = [
    contentListItemFixture("newest-other", "recht-steuern"),
    current,
    contentListItemFixture("abi-1", "abiball"),
    contentListItemFixture("abi-2", "abiball"),
    contentListItemFixture("abi-3", "abiball"),
    contentListItemFixture("abi-4", "abiball"),
  ]
  expect(contentRelatedList(current, items).map((item) => item.entry.slug)).toEqual(["abi-1", "abi-2", "abi-3"])
})

test("related articles fill up with the latest other articles when the category has too few", () => {
  const items = [
    contentListItemFixture("latest-a", "eventformate"),
    contentListItemFixture("abi-1", "abiball"),
    current,
    contentListItemFixture("latest-b", "recht-steuern"),
    contentListItemFixture("latest-c", "eventformate"),
  ]
  expect(contentRelatedList(current, items).map((item) => item.entry.slug)).toEqual(["abi-1", "latest-a", "latest-b"])
})

test("related articles are empty when the current article is the only one", () => {
  expect(contentRelatedList(current, [current])).toEqual([])
})
