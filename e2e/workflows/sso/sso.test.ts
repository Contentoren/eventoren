import { browserErrorsTest as test } from "../../config/browserErrorsTest.ts"
import { e2eEnvironmentRead } from "../../config/e2eEnvironmentRead.ts"
import { ssoCallbackVerify } from "./ssoCallbackVerify.ts"
import { ssoLandingVerify } from "./ssoLandingVerify.ts"

const environmentResult = e2eEnvironmentRead(process.env)
if (!environmentResult.success) throw new Error(environmentResult.errorMessage)
const environment = environmentResult.data
test("testadmin signs in through Eventoren SSO and reaches the authenticated application", {
  timeout: 180_000,
}, async ({ page }) => {
  const callbacks = await ssoLandingVerify(page, environment.baseUrl)
  await ssoCallbackVerify(page, environment.baseUrl, callbacks)
})
