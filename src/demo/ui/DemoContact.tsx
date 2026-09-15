import { ContactPageView } from "../../contact/ContactPageView.tsx"
import { contactPageStateCreate } from "../../contact/contactPageStateCreate.ts"
import type { JSX } from "solid-js"
import { DemoShell } from "./DemoShell.tsx"

export function DemoContact(props: { readonly submitted?: boolean }) {
  const state = contactPageStateCreate({ initialSubmitted: props.submitted })

  return (
    <ContactPageView
      state={state}
      frame={(frameProps: { readonly children?: JSX.Element }) => (
        <DemoShell currentId={props.submitted ? "contact-submitted" : "contact"}>{frameProps.children}</DemoShell>
      )}
    />
  )
}
