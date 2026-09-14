import * as a from "valibot"

export type SocialLoginProvider = keyof typeof socialLoginProvider

export const socialLoginProvider = {
  google: "google",
  github: "github",
  microsoft: "microsoft",
  zitadel: "zitadel",
} as const

export const socialLoginProviderSchema = a.enum(socialLoginProvider)

export const socialLoginProviders: Readonly<SocialLoginProvider[]> = Object.values(socialLoginProvider)

export type LoginProvider = keyof typeof loginProvider

export const loginProvider = {
  ...socialLoginProvider,
  dev: "dev",
} as const

export const loginProviderSchema = a.enum(loginProvider)

export const loginProviders: Readonly<LoginProvider[]> = Object.values(loginProvider)
