import { expect, test } from "bun:test"
import { contentBreadcrumbsCreate } from "./contentBreadcrumbsCreate.ts"

test("hub breadcrumb stays home then current hub", () => {
  expect(contentBreadcrumbsCreate("ratgeber")).toEqual([
    { label: "Startseite", href: "/" },
    { label: "Ratgeber", href: null },
  ])
  expect(contentBreadcrumbsCreate("guides")).toEqual([
    { label: "Eventoren", href: "/" },
    { label: "Guides", href: null },
  ])
})

test("article breadcrumb inserts the category level with a hub section anchor", () => {
  expect(
    contentBreadcrumbsCreate("ratgeber", { title: "Tickets online verkaufen", category: "tickets-verkaufen" }),
  ).toEqual([
    { label: "Startseite", href: "/" },
    { label: "Ratgeber", href: "/ratgeber" },
    { label: "Tickets verkaufen", href: "/ratgeber#tickets-verkaufen" },
    { label: "Tickets online verkaufen", href: null },
  ])
})

test("english article breadcrumb uses the english category label and guides anchor", () => {
  expect(contentBreadcrumbsCreate("guides", { title: "Sell tickets online", category: "selling-tickets" })).toEqual([
    { label: "Eventoren", href: "/" },
    { label: "Guides", href: "/en/guides" },
    { label: "Selling tickets", href: "/en/guides#selling-tickets" },
    { label: "Sell tickets online", href: null },
  ])
})

test("article in a category without a hub section falls back to the hub path", () => {
  expect(contentBreadcrumbsCreate("ratgeber", { title: "Orphan", category: "no-such-category" })).toEqual([
    { label: "Startseite", href: "/" },
    { label: "Ratgeber", href: "/ratgeber" },
    { label: "no-such-category", href: "/ratgeber" },
    { label: "Orphan", href: null },
  ])
})
