export type PageNameAuth = keyof typeof pageNameAuth

export const pageNameAuth = {
  signUp: "signUp",
  signUpConfirmEmail: "signUpConfirmEmail",
  signIn: "signIn",
  signInEnterOtp: "signInEnterOtp",
  signInError: "signInError",
  userProfileMe: "userProfileMe",
  userProfileMeEdit: "userProfileMeEdit",
  userProfileMeChangePassword: "userProfileMeChangePassword",
  userProfileMeChangeEmail: "userProfileMeChangeEmail",
  userProfileMeImage: "userProfileMeImage",
  userProfileMeDelete: "userProfileMeDelete",
  userProfileView: "userProfileView",
} as const
