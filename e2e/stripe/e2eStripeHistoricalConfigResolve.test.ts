import { expect, test } from "@rstest/core"
import { createResult } from "#result"
import { e2eStripeHistoricalConfigResolve } from "./e2eStripeHistoricalConfigResolve.ts"

const explicitKey = "sk_test_explicit01"
const explicitAccountId = "acct_explicit01"
const explicitOrganizationId = "org_explicit01"

function ownerOnlyStat(overrides: { mode?: number; isSymbolicLink?: boolean } = {}) {
  return {
    mode: overrides.mode ?? 0o600,
    isFile: true,
    isSymbolicLink: overrides.isSymbolicLink ?? false,
    uid: process.getuid?.() ?? 0,
  }
}

function accountFixture(accountId: string) {
  return { account: async () => createResult(accountId) }
}

test("honors explicit credentials matching the selected target without Billing service reads", async () => {
  let serviceReads = 0
  const unreadable = async (): Promise<never> => {
    serviceReads++
    throw new Error("service read must not happen for explicit credentials")
  }
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {
      E2E_STRIPE_TEST_SECRET_KEY: explicitKey,
      E2E_STRIPE_TEST_ACCOUNT_ID: explicitAccountId,
      E2E_BILLING_ORGANIZATION_ID: explicitOrganizationId,
    },
    billingProjectResolve: unreadable as never,
    serviceEnvironmentFiles: unreadable as never,
    eventorenDirectory: "/eventoren-fixture",
    fileRead: async (path) => {
      expect(path).toBe("/eventoren-fixture/.env.development")
      return `EVENTOREN_BILLING_ORGANIZATION_ID=${explicitOrganizationId}\n`
    },
    fileStat: unreadable as never,
    stripeClient: accountFixture(explicitAccountId),
  })
  expect(result).toMatchObject({
    success: true,
    data: { key: explicitKey, accountId: explicitAccountId, organizationId: explicitOrganizationId },
  })
  expect(serviceReads).toBe(0)
})

test("fails explicit credentials on TEST account mismatch without leaking the key", async () => {
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {
      E2E_STRIPE_TEST_SECRET_KEY: explicitKey,
      E2E_STRIPE_TEST_ACCOUNT_ID: explicitAccountId,
      E2E_BILLING_ORGANIZATION_ID: explicitOrganizationId,
    },
    stripeClient: accountFixture("acct_other02"),
    fileRead: async () => `EVENTOREN_BILLING_ORGANIZATION_ID=${explicitOrganizationId}\n`,
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/account identity mismatch/)
  expect(JSON.stringify(result)).not.toContain(explicitKey)
})

test.each(["development", "production"] as const)(
  "rejects an explicit organization conflicting with the selected %s target before provider access",
  async (target) => {
    let accountCalls = 0
    const paths: string[] = []
    const result = await e2eStripeHistoricalConfigResolve({
      target,
      eventorenDirectory: "/eventoren-fixture",
      environment: {
        E2E_STRIPE_TEST_SECRET_KEY: explicitKey,
        E2E_STRIPE_TEST_ACCOUNT_ID: explicitAccountId,
        E2E_BILLING_ORGANIZATION_ID: explicitOrganizationId,
      },
      fileRead: async (path) => {
        paths.push(path)
        return "EVENTOREN_BILLING_ORGANIZATION_ID=org_selectedtarget\n"
      },
      stripeClient: {
        account: async () => {
          accountCalls++
          return createResult(explicitAccountId)
        },
      },
    })
    expect(result.success).toBe(false)
    if (result.success) throw new Error("expected target mismatch")
    expect(result.errorMessage).toMatch(/differs from selected target/)
    expect(paths).toEqual([`/eventoren-fixture/.env.${target}`])
    expect(accountCalls).toBe(0)
    expect(JSON.stringify(result)).not.toContain(explicitKey)
    expect(JSON.stringify(result)).not.toContain(explicitOrganizationId)
  },
)

test("rejects an accessible target missing its organization even with partial explicit credentials", async () => {
  let fallbackCalls = 0
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: { E2E_BILLING_ORGANIZATION_ID: explicitOrganizationId },
    fileRead: async () => "PUBLIC_ENV_MODE=development\n",
    billingProjectResolve: async () => {
      fallbackCalls++
      return createResult({ directory: "/unused", units: [] })
    },
  })
  expect(result.success).toBe(false)
  expect(fallbackCalls).toBe(0)
})

test("allows standalone explicit credentials when the selected target file is inaccessible", async () => {
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {
      E2E_STRIPE_TEST_SECRET_KEY: explicitKey,
      E2E_STRIPE_TEST_ACCOUNT_ID: explicitAccountId,
      E2E_BILLING_ORGANIZATION_ID: explicitOrganizationId,
    },
    fileRead: async () => {
      throw new Error("target unavailable")
    },
    stripeClient: accountFixture(explicitAccountId),
  })
  expect(result).toMatchObject({ success: true, data: { organizationId: explicitOrganizationId } })
})

test("resolves the registered Billing TEST default while ignoring live keys", async () => {
  const billingDirectory = "/billing-default-fixture"
  const readPaths: string[] = []
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {},
    billingProjectDirectory: billingDirectory,
    eventorenDirectory: "/eventoren-fixture",
    serviceEnvironmentFiles: async () => createResult([`${billingDirectory}/.env`]),
    fileStat: async () => ownerOnlyStat(),
    fileRead: async (path) => {
      readPaths.push(path)
      if (path === `${billingDirectory}/.env`)
        return "EVENTOREN_STRIPE_API_KEY=sk_live_muststayunread\nEVENTOREN_STRIPE_API_KEY_TEST=sk_test_default456\n"
      return "EVENTOREN_BILLING_ORGANIZATION_ID=org_defaultdev\n"
    },
    stripeClient: accountFixture("acct_default456"),
  })
  expect(result).toMatchObject({
    success: true,
    data: { key: "sk_test_default456", accountId: "acct_default456", organizationId: "org_defaultdev" },
  })
  expect(readPaths).toContain(`${billingDirectory}/.env`)
  expect(readPaths).toContain("/eventoren-fixture/.env.development")
})

test("derives the billing directory from registry metadata with service-file cross-check", async () => {
  const billingDirectory = "/billing-registry-fixture"
  let seenUnits: string[] = []
  const result = await e2eStripeHistoricalConfigResolve({
    target: "production",
    environment: {},
    eventorenDirectory: "/eventoren-fixture",
    billingProjectResolve: async () =>
      createResult({ directory: billingDirectory, units: ["billing-preview.service"] }),
    serviceEnvironmentFiles: async (units) => {
      seenUnits = units
      return createResult([`${billingDirectory}/.env`])
    },
    fileStat: async () => ownerOnlyStat(),
    fileRead: async (path) => {
      if (path === `${billingDirectory}/.env`) return "EVENTOREN_STRIPE_API_KEY_TEST=sk_test_registry789\n"
      return "EVENTOREN_BILLING_ORGANIZATION_ID=org_registryprod\n"
    },
    stripeClient: accountFixture("acct_registry789"),
  })
  expect(result).toMatchObject({
    success: true,
    data: { key: "sk_test_registry789", accountId: "acct_registry789", organizationId: "org_registryprod" },
  })
  expect(seenUnits).toEqual(["billing-preview.service"])
})

test("forwards minimal USER plus explicit registry socket env without leaking the TEST key", async () => {
  const secretKey = "sk_test_envleak09"
  let seenArgs: readonly string[] = []
  let seenEnv: Record<string, string> = {}
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {
      E2E_STRIPE_TEST_SECRET_KEY: secretKey,
      PATH: "/usr/bin:/bin",
      HOME: "/home/leo",
      USER: "leo",
      PROJECT_REGISTRY_SOCKET: "/run/project-registry/leo.sock",
    },
    billingProjectExec: (args, env) => {
      seenArgs = args
      seenEnv = env
      return JSON.stringify({
        data: [
          {
            path: "/billing-registry-fixture",
            labels: { sourcePath: "/billing-registry-fixture" },
            units: ["billing-preview.service"],
          },
        ],
      })
    },
    eventorenDirectory: "/eventoren-fixture",
    serviceEnvironmentFiles: async () => createResult(["/billing-registry-fixture/.env"]),
    fileStat: async () => ownerOnlyStat(),
    fileRead: async (path) => {
      if (path === "/billing-registry-fixture/.env") return "EVENTOREN_STRIPE_API_KEY_TEST=sk_test_registry789\n"
      return "EVENTOREN_BILLING_ORGANIZATION_ID=org_registryprod\n"
    },
    stripeClient: accountFixture("acct_registry789"),
  })
  expect(result).toMatchObject({
    success: true,
    data: { key: "sk_test_registry789", accountId: "acct_registry789", organizationId: "org_registryprod" },
  })
  expect([...seenArgs]).toEqual(["--json", "project", "get", "billing"])
  expect(seenEnv["USER"]).toBe("leo")
  expect(seenEnv["PROJECT_REGISTRY_SOCKET"]).toBe("/run/project-registry/leo.sock")
  expect("E2E_STRIPE_TEST_SECRET_KEY" in seenEnv).toBe(false)
  expect(JSON.stringify(seenEnv)).not.toContain(secretKey)
})

test("fails closed when the Billing service file is not owner-only instead of reporting provider absence", async () => {
  const billingDirectory = "/billing-permissive-fixture"
  const result = await e2eStripeHistoricalConfigResolve({
    target: "development",
    environment: {},
    billingProjectDirectory: billingDirectory,
    eventorenDirectory: "/eventoren-fixture",
    serviceEnvironmentFiles: async () => createResult([`${billingDirectory}/.env`]),
    fileStat: async () => ownerOnlyStat({ mode: 0o644 }),
    fileRead: async () => {
      throw new Error("unreadable file must not be read")
    },
    stripeClient: accountFixture("acct_unused"),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/checkpoint retained/)
  expect(result.errorMessage).not.toMatch(/no-fixture/)
})

test("fails closed when the selected Eventoren target has no billing organization", async () => {
  const billingDirectory = "/billing-noorg-fixture"
  const readPaths: string[] = []
  const result = await e2eStripeHistoricalConfigResolve({
    target: "production",
    environment: {},
    billingProjectDirectory: billingDirectory,
    eventorenDirectory: "/eventoren-fixture",
    serviceEnvironmentFiles: async () => createResult([`${billingDirectory}/.env`]),
    fileStat: async () => ownerOnlyStat(),
    fileRead: async (path) => {
      readPaths.push(path)
      if (path === `${billingDirectory}/.env`) return "EVENTOREN_STRIPE_API_KEY_TEST=sk_test_noorg03\n"
      return "EVENTOREN_BILLING_BASE_URL=https://billing.contentoren.de\n"
    },
    stripeClient: accountFixture("acct_noorg03"),
  })
  expect(result.success).toBe(false)
  if (result.success) throw new Error("expected failure")
  expect(result.errorMessage).toMatch(/checkpoint retained/)
  expect(readPaths).toContain("/eventoren-fixture/.env.production")
})
