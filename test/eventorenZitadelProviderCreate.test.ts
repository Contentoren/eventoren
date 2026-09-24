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

test("maps name and picture independently and omits missing profile claims", () => {
  expect(
    eventorenZitadelProviderCreate({ sub: "subject-profile", name: "Ada", picture: "https://img.test/ada" }),
  ).toMatchObject({
    givenName: "Ada",
    image: "https://img.test/ada",
  })
  expect(
    eventorenZitadelProviderCreate({ sub: "subject-picture-only", picture: "https://img.test/new" }),
  ).toMatchObject({
    image: "https://img.test/new",
  })
  expect(
    eventorenZitadelProviderCreate({ sub: "subject-picture-only", picture: "https://img.test/new" }),
  ).not.toHaveProperty("givenName")
  expect(eventorenZitadelProviderCreate({ sub: "subject-name-only", given_name: "Grace" })).toMatchObject({
    givenName: "Grace",
  })
  expect(eventorenZitadelProviderCreate({ sub: "subject-name-only", given_name: "Grace" })).not.toHaveProperty("image")
  expect(eventorenZitadelProviderCreate({ sub: "subject-empty", name: "", picture: "" })).not.toHaveProperty(
    "givenName",
  )
  expect(eventorenZitadelProviderCreate({ sub: "subject-empty", name: "", picture: "" })).not.toHaveProperty("image")
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

test("uses verified ID-token roles instead of userinfo roles when role sync is enabled", () => {
  const provider = eventorenZitadelProviderCreate(
    { sub: "subject-4", "urn:zitadel:iam:org:project:roles": { admin: ["untrusted-org"] } },
    { enabled: true, roles: ["organizer"] },
  )

  expect(provider).toMatchObject({ zitadelRoles: ["organizer"], zitadelRoleSyncEnabled: true })
})
