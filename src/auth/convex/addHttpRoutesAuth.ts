import type { HttpRouter } from "convex/server"
import { apiAuthBasePath } from "#src/auth/api_client/apiAuthBasePath.ts"
import { addRouteWithCors } from "#src/auth/convex/headers/cors/addRouteWithCors.ts"
import { httpMethod } from "#src/auth/convex/headers/httpMethod.ts"
import { signInViaEmail1RequestHandler } from "#src/auth/convex/sign_in_email/signInViaEmail1RequestHandler.ts"
import { signInViaEmailEnterOtp1RequestHandler } from "#src/auth/convex/sign_in_email/signInViaEmailEnterOtp1RequestHandler.ts"
import { signInViaPw1RequestHandler } from "#src/auth/convex/sign_in_pw/signInViaPw1RequestHandler.ts"
import { signInUsingSocialAuth1RequestHandler } from "#src/auth/convex/sign_in_social/signInUsingSocialAuth1RequestHandler.ts"
import { signUp1RequestHandler } from "#src/auth/convex/sign_up/signUp1RequestHandler.ts"
import { signUpConfirmEmail1RequestHandler } from "#src/auth/convex/sign_up/signUpConfirmEmail1RequestHandler.ts"
import { userDelete1RequestHandler } from "#src/auth/convex/user/delete/userDelete1RequestHandler.ts"
import { userEmailChange1RequestHandler } from "#src/auth/convex/user/email_change/userEmailChange1RequestHandler.ts"
import { userEmailChange2ConfirmHandler } from "#src/auth/convex/user/email_change/userEmailChange2ConfirmHandler.ts"
import { userProfileUpdate1RequestHandler } from "#src/auth/convex/user/profile_update/userProfileUpdate1RequestHandler.ts"
import { userPasswordChange1RequestHandler } from "#src/auth/convex/user/pw_change/userPasswordChange1RequestHandler.ts"
import { userPasswordChange2ConfirmHandler } from "#src/auth/convex/user/pw_change/userPasswordChange2ConfirmHandler.ts"
import { loginProvider, socialLoginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { apiPathAuth } from "#src/auth/url/apiPathAuth.ts"

export function addHttpRoutesAuth(http: HttpRouter) {
  // Oauth / GitHub
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signInViaGithub, httpMethod.GET, async (ctx, request) => {
    return signInUsingSocialAuth1RequestHandler(socialLoginProvider.github, ctx, request)
  })
  // Oauth / Google
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signInViaGoogle, httpMethod.GET, async (ctx, request) => {
    return signInUsingSocialAuth1RequestHandler(socialLoginProvider.google, ctx, request)
  })
  // Oauth / Dev
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signInViaDev, httpMethod.GET, async (ctx, request) => {
    return signInUsingSocialAuth1RequestHandler(loginProvider.dev, ctx, request)
  })

  // Sign up routes
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signUp, httpMethod.POST, signUp1RequestHandler)
  // Sign up confirm email routes
  addRouteWithCors(
    http,
    apiAuthBasePath + apiPathAuth.signUpConfirmEmail,
    httpMethod.POST,
    signUpConfirmEmail1RequestHandler,
  )

  // Sign in via password routes
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signInViaPw, httpMethod.POST, signInViaPw1RequestHandler)
  // Sign in via email routes
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.signInViaEmail, httpMethod.POST, signInViaEmail1RequestHandler)

  // Sign in via email enter OTP routes
  addRouteWithCors(
    http,
    apiAuthBasePath + apiPathAuth.signInViaEmailEnterOtp,
    httpMethod.POST,
    signInViaEmailEnterOtp1RequestHandler,
  )
  // Profile actions
  addHttpRoutesAuthProfile(http)

  // Is online routes
  addRouteWithCors(http, "/api/isOnline", httpMethod.GET, async (ctx, request) => {
    return new Response("OK")
  })
  return http
}

function addHttpRoutesAuthProfile(http: HttpRouter) {
  // Update profile routes
  addRouteWithCors(
    //
    http,
    apiAuthBasePath + apiPathAuth.profileUpdate,
    httpMethod.POST,
    userProfileUpdate1RequestHandler,
  )
  // Change password routes
  addRouteWithCors(
    http,
    apiAuthBasePath + apiPathAuth.passwordChangeRequest,
    httpMethod.POST,
    userPasswordChange1RequestHandler,
  )
  addRouteWithCors(
    http,
    apiAuthBasePath + apiPathAuth.passwordChangeConfirm,
    httpMethod.POST,
    userPasswordChange2ConfirmHandler,
  )
  // Change email routes
  addRouteWithCors(
    //
    http,
    apiAuthBasePath + apiPathAuth.emailChangeRequest,
    httpMethod.POST,
    userEmailChange1RequestHandler,
  )
  // Change email confirm routes
  addRouteWithCors(
    //
    http,
    apiAuthBasePath + apiPathAuth.emailChangeConfirm,
    httpMethod.POST,
    userEmailChange2ConfirmHandler,
  )
  // Delete user routes
  addRouteWithCors(http, apiAuthBasePath + apiPathAuth.userDelete, httpMethod.POST, userDelete1RequestHandler)
}
