export type ApiRouteAuth = keyof typeof apiRouteAuth

export const apiRouteAuth = {
  signInViaGoogle: "signInViaGoogle",
  signInViaGithub: "signInViaGithub",
  signInViaDev: "signInViaDev",
  profileUpdate: "profileUpdate",
  passwordChangeRequest: "passwordChangeRequest",
  passwordChangeConfirm: "passwordChangeConfirm",
  emailChangeRequest: "emailChangeRequest",
  emailChangeConfirm: "emailChangeConfirm",
  userDelete: "userDelete",
} as const

export const apiPathAuth = {
  signInViaGoogle: "/google",
  signInViaGithub: "/github",
  signInViaDev: "/dev",
  profileUpdate: "/profile-update",
  passwordChangeRequest: "/password-change-request",
  passwordChangeConfirm: "/password-change-confirm",
  emailChangeRequest: "/email-change-request",
  emailChangeConfirm: "/email-change-confirm",
  userDelete: "/user-delete",
} as const satisfies Record<ApiRouteAuth, string>
