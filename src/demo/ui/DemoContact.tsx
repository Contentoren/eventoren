import { ContactPageView } from "../../contact/ContactPageView.tsx"
import { contactPageStateCreate } from "../../contact/contactPageStateCreate.ts"
import type { JSX } from "solid-js"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoContact(props: { readonly submitted?: boolean }) {
  const state = contactPageStateCreate({ initialSubmitted: props.submitted })

  return (
    <ContactPageView
      state={state}
      frame={(frameProps: { readonly children?: JSX.Element }) => (
        <DemoSiteFrame currentId={props.submitted ? "contact-submitted" : "contact"}>
          {frameProps.children}
        </DemoSiteFrame>
      )}
    />
  )
}
