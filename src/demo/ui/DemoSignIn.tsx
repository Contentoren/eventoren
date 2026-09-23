import { demoSignInPageStateCreate } from "../state/demoSignInPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"
import { DemoSignInPage } from "./DemoSignInPage.tsx"

export function DemoSignIn(props: { readonly error?: boolean }) {
  const state = demoSignInPageStateCreate(props.error ?? false)

  return (
    <DemoScenarioFrame currentId={props.error ? "auth-sign-in-error" : "auth-sign-in"}>
      <DemoSignInPage state={state} />
    </DemoScenarioFrame>
  )
}
