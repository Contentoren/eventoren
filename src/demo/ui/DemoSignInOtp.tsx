import { SignInEnterOtpPage } from "../../auth/ui/SignInEnterOtpPage.tsx"
import { demoSignInEnterOtpPageStateCreate } from "../state/demoSignInEnterOtpPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoSignInOtp(props: { readonly error?: boolean }) {
  const state = demoSignInEnterOtpPageStateCreate(props.error ?? false)

  return (
    <DemoShell currentId={props.error ? "auth-otp-error" : "auth-otp"}>
      <SignInEnterOtpPage initialEmail="alex@example.test" initialCode="246810" returnTo="/demo/orders" state={state} />
    </DemoShell>
  )
}
