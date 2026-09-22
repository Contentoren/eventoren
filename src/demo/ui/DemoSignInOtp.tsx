import { SignInEnterOtpPage } from "../../auth/ui/SignInEnterOtpPage.tsx"
import { demoSignInEnterOtpPageStateCreate } from "../state/demoSignInEnterOtpPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoSignInOtp(props: { readonly error?: boolean }) {
  const state = demoSignInEnterOtpPageStateCreate(props.error ?? false)

  return (
    <DemoScenarioFrame currentId={props.error ? "auth-otp-error" : "auth-otp"}>
      <SignInEnterOtpPage
        initialEmail="alex@example.test"
        initialCode="246810"
        returnTo="/demo/customer/orders"
        state={state}
      />
    </DemoScenarioFrame>
  )
}
