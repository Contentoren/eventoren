import { describe, expect, test } from "bun:test"

import { dashProfileValidate } from "./dashProfileValidate.ts"

describe("dashProfileValidate", () => {
  test("akzeptiert eine gültige Profiländerung ohne Fehler", () => {
    const errors = dashProfileValidate(
      {
        name: "Kulturhaus Lindenhof e.V.",
        slug: "kulturhaus-lindenhof",
        subtitle: "Konzerte im grünen Hof",
        description: "Willkommen bei uns.",
        website: "https://kulturhaus-lindenhof.de",
        email: "hallo@kulturhaus-lindenhof.de",
        phone: "+49 341 47110",
        socials: { tiktok: "kulturhauslindenhof" },
        imprint: {
          legalName: "Kulturhaus Lindenhof e.V.",
          street: "Lindenhofstraße 12",
          zip: "04109",
          city: "Leipzig",
          representative: "Mara Lindner",
        },
      },
      ["abikur-ikg-2027"],
    )
    expect(errors).toEqual({})
  })

  test("meldet einen zu kurzen oder zu langen Namen", () => {
    expect(dashProfileValidate({ name: "A" })["name"]).toContain("2 Zeichen")
    expect(dashProfileValidate({ name: `A${"a".repeat(80)}` })["name"]).toContain("80 Zeichen")
  })

  test("meldet zu lange Untertitel und Beschreibungen", () => {
    expect(dashProfileValidate({ subtitle: "x".repeat(81) })["subtitle"]).toContain("80 Zeichen")
    expect(dashProfileValidate({ description: "x".repeat(1001) })["description"]).toContain("1000 Zeichen")
  })

  test("meldet Websites ohne https und ungültige E-Mails", () => {
    expect(dashProfileValidate({ website: "kulturhaus.de" })["website"]).toContain("https://")
    expect(dashProfileValidate({ email: "keine-mail" })["email"]).toContain("E-Mail")
  })

  test("meldet ungültige und vergebene Profil-Links", () => {
    expect(dashProfileValidate({ slug: "Kultur Haus!" })["slug"]).toContain("Kleinbuchstaben")
    expect(dashProfileValidate({ slug: "kulturhaus-lindenhof" }, ["kulturhaus-lindenhof"])["slug"]).toContain(
      "vergeben",
    )
  })

  test("meldet leere Pflichtangaben im Impressum", () => {
    const errors = dashProfileValidate({ imprint: { legalName: "  ", city: "" } })
    expect(errors["imprint.legalName"]).toContain("Impressum")
    expect(errors["imprint.city"]).toContain("Impressum")
  })
})
