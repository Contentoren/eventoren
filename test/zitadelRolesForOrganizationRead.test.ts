import { expect, test } from "bun:test"
import { zitadelRolesForOrganizationRead } from "../src/auth/server/zitadelRolesForOrganizationRead.ts"

test("reads only known project roles granted in the configured Zitadel organization", () => {
  const roles = zitadelRolesForOrganizationRead(
    {
      "urn:zitadel:iam:org:project:eventoren-project:roles": {
        admin: { "eventoren-org": "Eventoren", "other-org": "Other" },
        organizer: { "other-org": "Other" },
        customer: { "eventoren-org": "Eventoren" },
        unknown: { "eventoren-org": "Eventoren" },
      },
    },
    "eventoren-org",
    "eventoren-project",
  )

  expect(roles).toEqual(["admin", "customer"])
})

test("accepts own organization membership regardless of the organization name value", () => {
  expect(
    zitadelRolesForOrganizationRead(
      {
        "urn:zitadel:iam:org:project:eventoren-project:roles": {
          admin: { "eventoren-org": "" },
          organizer: { "eventoren-org": null },
        },
      },
      "eventoren-org",
      "eventoren-project",
    ),
  ).toEqual(["admin", "organizer"])
})

test("treats missing, inherited, wrong-organization, or malformed organization maps as no roles", () => {
  expect(zitadelRolesForOrganizationRead({}, "eventoren-org", "eventoren-project")).toEqual([])
  expect(
    zitadelRolesForOrganizationRead(
      { "urn:zitadel:iam:org:project:eventoren-project:roles": ["admin"] },
      "eventoren-org",
      "eventoren-project",
    ),
  ).toEqual([])
  expect(
    zitadelRolesForOrganizationRead(
      {
        "urn:zitadel:iam:org:project:eventoren-project:roles": {
          admin: Object.create({ "eventoren-org": "Inherited" }),
          organizer: { "other-org": "Other" },
          customer: ["eventoren-org"],
        },
      },
      "eventoren-org",
      "eventoren-project",
    ),
  ).toEqual([])
  expect(
    zitadelRolesForOrganizationRead(
      { "urn:zitadel:iam:org:project:eventoren-project:roles": { admin: "eventoren-org", organizer: null } },
      "eventoren-org",
      "eventoren-project",
    ),
  ).toEqual([])
})

test("does not accept roles from another project or the unscoped claim", () => {
  expect(
    zitadelRolesForOrganizationRead(
      {
        "urn:zitadel:iam:org:project:other-project:roles": { admin: { "eventoren-org": "Other" } },
        "urn:zitadel:iam:org:project:roles": { admin: { "eventoren-org": "Legacy" } },
      },
      "eventoren-org",
      "eventoren-project",
    ),
  ).toEqual([])
})
