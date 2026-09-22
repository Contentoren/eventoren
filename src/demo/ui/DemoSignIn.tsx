import { SignInPage } from "../../auth/ui/SignInPage.tsx"
import { demoSignInPageStateCreate } from "../state/demoSignInPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoSignIn(props: { readonly error?: boolean }) {
  const state = demoSignInPageStateCreate(props.error ?? false)

  return (
    <DemoScenarioFrame currentId={props.error ? "auth-sign-in-error" : "auth-sign-in"}>
      <SignInPage returnTo="/demo/customer/orders" state={state} />
    </DemoScenarioFrame>
  )
}
