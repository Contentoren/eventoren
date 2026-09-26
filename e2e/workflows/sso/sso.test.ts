import { test } from "@rstest/playwright"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { ssoLandingVerify } from "./ssoLandingVerify.ts"
import { ssoCallbackVerify } from "./ssoCallbackVerify.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const environment = environmentResult.data

test("testadmin signs in through Eventoren SSO and reaches the authenticated application", {
  timeout: 180_000,
}, async ({ page }) => {
  const callbacks = await ssoLandingVerify(page, environment.baseUrl)
  await ssoCallbackVerify(page, environment.baseUrl, callbacks)
})
