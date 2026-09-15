import { expect, test } from "bun:test"
import { authZitadelManagementConfigRead } from "../src/auth/server/authZitadelManagementConfigRead.ts"

test("reads the Management API config without URL.canParse", () => {
  const previousCanParse = Object.getOwnPropertyDescriptor(URL, "canParse")
  const previous = {
    issuer: process.env.ZITADEL_ISSUER,
    managementBaseUrl: process.env.ZITADEL_MANAGEMENT_BASE_URL,
    managementToken: process.env.ZITADEL_MANAGEMENT_TOKEN,
    organizationId: process.env.ZITADEL_ORGANIZATION_ID,
    projectId: process.env.ZITADEL_PROJECT_ID,
  }
  process.env.ZITADEL_ISSUER = "https://auth.example.test"
  delete process.env.ZITADEL_MANAGEMENT_BASE_URL
  process.env.ZITADEL_MANAGEMENT_TOKEN = "management-token"
  process.env.ZITADEL_ORGANIZATION_ID = "organization-id"
  process.env.ZITADEL_PROJECT_ID = "project-id"

  Object.defineProperty(URL, "canParse", { configurable: true, value: undefined })
  try {
    expect(authZitadelManagementConfigRead()).toEqual({
      success: true,
      data: {
        baseUrl: "https://auth.example.test",
        organizationId: "organization-id",
        projectId: "project-id",
        token: "management-token",
      },
    })
  } finally {
    if (previousCanParse) Object.defineProperty(URL, "canParse", previousCanParse)
    else Reflect.deleteProperty(URL, "canParse")
    restore("ZITADEL_ISSUER", previous.issuer)
    restore("ZITADEL_MANAGEMENT_BASE_URL", previous.managementBaseUrl)
    restore("ZITADEL_MANAGEMENT_TOKEN", previous.managementToken)
    restore("ZITADEL_ORGANIZATION_ID", previous.organizationId)
    restore("ZITADEL_PROJECT_ID", previous.projectId)
  }
})

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
