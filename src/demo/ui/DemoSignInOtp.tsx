import { demoSignInEnterOtpPageStateCreate } from "../state/demoSignInEnterOtpPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"
import { DemoSignInOtpPage } from "./DemoSignInOtpPage.tsx"

export function DemoSignInOtp(props: { readonly error?: boolean }) {
  const state = demoSignInEnterOtpPageStateCreate(props.error ?? false)

  return (
    <DemoScenarioFrame currentId={props.error ? "auth-otp-error" : "auth-otp"}>
      <DemoSignInOtpPage state={state} />
    </DemoScenarioFrame>
  )
}
