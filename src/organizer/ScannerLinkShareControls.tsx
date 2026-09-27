import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { scannerLinkShareControlsStateCreate } from "./scannerLinkShareControlsStateCreate.ts"

export function ScannerLinkShareControls(props: { readonly href: string; readonly name: string }) {
  let urlInput: HTMLInputElement | undefined
  const state = scannerLinkShareControlsStateCreate(
    () => props.href,
    () => props.name,
    () => urlInput?.select(),
  )
  return (
    <div class="flex flex-col gap-space-2">
      <Input
        aria-label={`Freigabelink für ${props.name}`}
        value={props.href}
        readOnly
        ref={urlInput}
        onFocus={(event) => event.currentTarget.select()}
      />
      <div class="flex flex-wrap gap-space-2">
        <Button onClick={state.copy}>Kopieren</Button>
        <LinkButtonExternal href={props.href} newTab>
          Öffnen
        </LinkButtonExternal>
        <Button onClick={state.share}>Teilen</Button>
      </div>
      <span role="status" class="text-sm text-content-muted">
        {state.message()}
      </span>
    </div>
  )
}
