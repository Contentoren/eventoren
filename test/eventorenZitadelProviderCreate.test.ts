import { expect, test } from "bun:test"
import { eventorenZitadelProviderCreate } from "../src/auth/server/eventorenZitadelProviderCreate.ts"

test("only maps verified Zitadel email claims", () => {
  const baseClaims = { sub: "subject-1", name: "Ada", email: "ada@example.test" }

  expect(eventorenZitadelProviderCreate({ ...baseClaims, email_verified: true })).toMatchObject({
    provider: "zitadel",
    providerId: "subject-1",
    email: "ada@example.test",
  })
  expect(eventorenZitadelProviderCreate({ ...baseClaims, email_verified: false })).not.toHaveProperty("email")
  expect(eventorenZitadelProviderCreate(baseClaims)).not.toHaveProperty("email")
})

test("maps the configured Zitadel project-role claim", () => {
  expect(
    eventorenZitadelProviderCreate({
      sub: "subject-2",
      name: "Organizer",
      "urn:zitadel:iam:org:project:roles": { organizer: ["eventoren"] },
    }),
  ).toMatchObject({ zitadelRoles: ["organizer"] })

  expect(
    eventorenZitadelProviderCreate({
      sub: "subject-3",
      name: "Customer",
      "urn:zitadel:iam:org:project:roles": {},
    }),
  ).toMatchObject({ zitadelRoles: [] })
})
