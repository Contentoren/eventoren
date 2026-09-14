import { serializeUrlParams } from "#utils/url/serializeUrlParams.js"
import type { PageNameAuth, pageNameAuth } from "./pageNameAuth.js"

export type PageRouteAuth = keyof typeof pageNameAuth

export const pageRouteAuth = {
  signUp: "/sign-up",
  signUpConfirmEmail: "/sign-up-confirm-email",
  signIn: "/sign-in",
  signInEnterOtp: "/sign-in-enter-otp",
  signInError: "/sign-in-error",
  userProfileMe: "/profile",
  userProfileMeEdit: "/profile/edit",
  userProfileMeChangePassword: "/profile/change-password",
  userProfileMeChangeEmail: "/profile/change-email",
  userProfileMeImage: "/profile/update-image",
  userProfileMeDelete: "/profile/delete",
  userProfileView: "/u/:username",
} as const satisfies Record<PageNameAuth, string>

export function urlPageSignUp(email?: string, returnPath?: string) {
  return pageRouteAuth.signUp + "?" + serializeSearchParams(email, returnPath)
}

export function urlPageSignIn(email?: string, returnPath?: string) {
  return pageRouteAuth.signIn + "?" + serializeSearchParams(email, returnPath)
}

export function urlUserProfileView(username: string) {
  return pageRouteAuth.userProfileView.replace(":username", username)
}

export function urlUserProfileMe() {
  return pageRouteAuth.userProfileMe
}

export function urlUserProfileMeEdit() {
  return pageRouteAuth.userProfileMeEdit
}

export function urlUserProfileMeChangePassword() {
  return pageRouteAuth.userProfileMeChangePassword
}

export function urlUserProfileMeChangeEmail() {
  return pageRouteAuth.userProfileMeChangeEmail
}

export function urlUserProfileMeImage() {
  return pageRouteAuth.userProfileMeImage
}

export function urlUserProfileMeDelete() {
  return pageRouteAuth.userProfileMeDelete
}

function serializeSearchParams(email?: string, returnPath?: string) {
  const obj: Record<string, string> = {}
  if (email) {
    obj.email = email
  }
  if (returnPath) {
    obj.returnPath = returnPath
  }
  return serializeUrlParams(obj)
}
