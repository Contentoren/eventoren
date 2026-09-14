import type { FooterV1Type } from "@adaptive-ds/email-generator/index.js"
import { envBaseUrlSiteResult } from "#src/app/env/public/envBaseUrlSiteResult.ts"
import type { Language } from "#src/app/i18n/language.ts"
import { appNameServer } from "#src/app/text/appName.ts"
import { appSubtitle } from "#src/app/text/appSubtitle.ts"

export function generateSharedEmailProps(l: Language) {
  const siteBaseUrlResult = envBaseUrlSiteResult()
  const siteBaseUrl = siteBaseUrlResult.success ? siteBaseUrlResult.data : ""
  return {
    homepageText: appNameServer(),
    homepageUrl: siteBaseUrl,
    hompageSubtitle: appSubtitle(l),
  } as const satisfies FooterV1Type
}
