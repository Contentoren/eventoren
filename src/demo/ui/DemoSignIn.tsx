import { SignInPage } from "../../auth/ui/SignInPage.tsx"
import { demoSignInPageStateCreate } from "../state/demoSignInPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoSignIn(props: { readonly error?: boolean }) {
  const state = demoSignInPageStateCreate(props.error ?? false)

  return (
    <DemoShell currentId={props.error ? "auth-sign-in-error" : "auth-sign-in"}>
      <SignInPage returnTo="/demo/orders" state={state} />
    </DemoShell>
  )
}
