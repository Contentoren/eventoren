import { describe, expect, test } from "bun:test"
import { localRehearsalIdentityValidate } from "../scripts/localRehearsalIdentityValidate.ts"
import { localRehearsalResourceNameValidate } from "../scripts/localRehearsalResourceNameValidate.ts"
import { localRehearsalSideEffectGuardCheck } from "../scripts/localRehearsalSideEffectGuard.ts"
import { localRehearsalSnapshotPathValidate } from "../scripts/localRehearsalSnapshotPathValidate.ts"

const stateRoot = "/home/leo/.local/state/eventoren/local-rehearsal"

describe("local rehearsal bootstrap guards", () => {
  test("identity guard only accepts the local rehearsal instance name", () => {
    expect(
      localRehearsalIdentityValidate({
        instanceName: "eventoren-local-rehearsal",
        expectedInstanceName: "eventoren-local-rehearsal",
      }).success,
    ).toBe(true)
    expect(
      localRehearsalIdentityValidate({ instanceName: "development", expectedInstanceName: "eventoren-local-rehearsal" })
        .success,
    ).toBe(false)
    expect(
      localRehearsalIdentityValidate({ instanceName: "production", expectedInstanceName: "eventoren-local-rehearsal" })
        .success,
    ).toBe(false)
    expect(
      localRehearsalIdentityValidate({ instanceName: "", expectedInstanceName: "eventoren-local-rehearsal" }).success,
    ).toBe(false)
  })

  test("resource name guard keeps container/network/volume overrides inside the rehearsal namespace", () => {
    expect(localRehearsalResourceNameValidate("eventoren-local-rehearsal").success).toBe(true)
    expect(localRehearsalResourceNameValidate("eventoren-local-rehearsal-data").success).toBe(true)
    for (const shared of [
      "eventoren-convex-data",
      "eventoren-convex-preview-data",
      "convex-data",
      "eventoren-local-rehearsal/../etc",
      "/eventoren-local-rehearsal",
      "eventoren-local-rehearsal ",
      "",
    ])
      expect(localRehearsalResourceNameValidate(shared).success).toBe(false)
  })

  test("side-effect guard refuses email, billing, payment, sso, storage, and remote state credentials", () => {
    expect(localRehearsalSideEffectGuardCheck({ allowlistedKeys: ["PUBLIC_ENV_MODE", "AUTH_SECRET"] }).success).toBe(
      true,
    )
    expect(
      localRehearsalSideEffectGuardCheck({
        allowlistedKeys: ["PUBLIC_ENV_MODE", "EVENTOREN_BILLING_BASE_URL", "STRIPE_SECRET_KEY"],
      }).success,
    ).toBe(false)
    expect(
      localRehearsalSideEffectGuardCheck({
        allowlistedKeys: ["PUBLIC_ENV_MODE", "EVENTOREN_BILLING_API_CREDENTIAL", "STRIPE_API_KEY"],
      }).success,
    ).toBe(false)
    expect(
      localRehearsalSideEffectGuardCheck({ allowlistedKeys: ["AUTH_SMTP_PASS", "AUTH_RESEND_API_KEY"] }).success,
    ).toBe(false)
    expect(
      localRehearsalSideEffectGuardCheck({ allowlistedKeys: ["ZITADEL_CLIENT_SECRET", "R2_SECRET_ACCESS_KEY"] })
        .success,
    ).toBe(false)
    expect(
      localRehearsalSideEffectGuardCheck({ allowlistedKeys: ["DATABASE_URL", "CONVEX_DEPLOYMENT", "SENTRY_DSN"] })
        .success,
    ).toBe(false)
  })

  test("snapshot path guard keeps snapshots under the private state root", () => {
    expect(
      localRehearsalSnapshotPathValidate({ snapshotPath: `${stateRoot}/snapshots/prod-20261020.zip`, stateRoot })
        .success,
    ).toBe(true)
    for (const outside of [
      "/tmp/prod-20261020.zip",
      `${stateRoot}/../prod-20261020.zip`,
      `${stateRoot}snapshots/prod.zip`,
      "/home/leo/.local/state/eventoren/other/snap.zip",
      "",
    ])
      expect(localRehearsalSnapshotPathValidate({ snapshotPath: outside, stateRoot }).success).toBe(false)
  })
})
