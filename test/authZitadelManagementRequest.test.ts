import { expect, test } from "bun:test"
import { authZitadelManagementRequest } from "../src/auth/server/authZitadelManagementRequest.ts"

test("uses the configured Management v1 organization header and bearer token", async () => {
  const previous = {
    issuer: process.env.ZITADEL_ISSUER,
    managementToken: process.env.ZITADEL_MANAGEMENT_TOKEN,
    organizationId: process.env.ZITADEL_ORGANIZATION_ID,
    projectId: process.env.ZITADEL_PROJECT_ID,
  }
  process.env.ZITADEL_ISSUER = "https://auth.example.test"
  process.env.ZITADEL_MANAGEMENT_TOKEN = "management-token"
  process.env.ZITADEL_ORGANIZATION_ID = "organization-id"
  process.env.ZITADEL_PROJECT_ID = "project-id"

  let request: Request | undefined
  try {
    const result = await authZitadelManagementRequest({
      body: { projectId: "project-id", roleKeys: ["organizer"] },
      fetch: async (input, init) => {
        request = new Request(input, init)
        return Response.json({})
      },
      method: "POST",
      path: "/management/v1/users/user-id/grants",
    })

    expect(result.success).toBe(true)
    expect(request?.url).toBe("https://auth.example.test/management/v1/users/user-id/grants")
    expect(request?.headers.get("authorization")).toBe("Bearer management-token")
    expect(request?.headers.get("x-zitadel-orgid")).toBe("organization-id")
    expect(await request?.json()).toEqual({ projectId: "project-id", roleKeys: ["organizer"] })
  } finally {
    restore("ZITADEL_ISSUER", previous.issuer)
    restore("ZITADEL_MANAGEMENT_TOKEN", previous.managementToken)
    restore("ZITADEL_ORGANIZATION_ID", previous.organizationId)
    restore("ZITADEL_PROJECT_ID", previous.projectId)
  }
})

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
