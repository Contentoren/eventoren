import { expect, test } from "bun:test"
import { eventorenAuthworksProviderCreate } from "../src/auth/server/eventorenAuthworksProviderCreate.ts"

test("only maps verified Authworks email claims", () => {
  const baseClaims = { sub: "subject-1", name: "Ada", email: "ada@example.test" }

  expect(eventorenAuthworksProviderCreate({ ...baseClaims, email_verified: true })).toMatchObject({
    provider: "authworks",
    providerId: "subject-1",
    email: "ada@example.test",
  })
  expect(eventorenAuthworksProviderCreate({ ...baseClaims, email_verified: false })).not.toHaveProperty("email")
  expect(eventorenAuthworksProviderCreate(baseClaims)).not.toHaveProperty("email")
})

test("maps name and picture independently and omits missing profile claims", () => {
  expect(
    eventorenAuthworksProviderCreate({ sub: "subject-profile", name: "Ada", picture: "https://img.test/ada" }),
  ).toMatchObject({
    givenName: "Ada",
    image: "https://img.test/ada",
  })
  expect(
    eventorenAuthworksProviderCreate({ sub: "subject-picture-only", picture: "https://img.test/new" }),
  ).toMatchObject({
    image: "https://img.test/new",
  })
  expect(
    eventorenAuthworksProviderCreate({ sub: "subject-picture-only", picture: "https://img.test/new" }),
  ).not.toHaveProperty("givenName")
  expect(eventorenAuthworksProviderCreate({ sub: "subject-name-only", given_name: "Grace" })).toMatchObject({
    givenName: "Grace",
  })
  expect(eventorenAuthworksProviderCreate({ sub: "subject-name-only", given_name: "Grace" })).not.toHaveProperty(
    "image",
  )
  expect(eventorenAuthworksProviderCreate({ sub: "subject-empty", name: "", picture: "" })).not.toHaveProperty(
    "givenName",
  )
  expect(eventorenAuthworksProviderCreate({ sub: "subject-empty", name: "", picture: "" })).not.toHaveProperty("image")
})

test("never carries project roles from Authworks claims", () => {
  const provider = eventorenAuthworksProviderCreate({
    sub: "subject-2",
    name: "Organizer",
    "urn:zitadel:iam:org:project:roles": { organizer: ["eventoren"] },
  })

  expect(provider).toMatchObject({ provider: "authworks", providerId: "subject-2" })
  expect(provider).not.toHaveProperty("zitadelRoles")
  expect(provider).not.toHaveProperty("zitadelRoleSyncEnabled")
})
