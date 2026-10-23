import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { cn } from "cn"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import type { ButtonSize, ButtonVariant } from "#ui/interactive/button/buttonCva.js"
import { copyButtonStateCreate } from "#ui/interactive/copy/copyButtonStateCreate.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export interface CopyButtonProps extends MayHaveClass {
  value: string
  label?: string
  ariaLabel?: string
  copiedLabel?: string
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Kopiert einen Wert in die Zwischenablage und bestätigt mit Häkchen für 1,5 s. */
export function CopyButton(p: CopyButtonProps) {
  const state = copyButtonStateCreate({
    value: () => p.value,
    copiedLabel: () => p.copiedLabel ?? "Kopiert",
  })

  const buttonProps = () => ({
    title: state.copied() ? state.copiedLabel() : (p.ariaLabel ?? "Kopieren"),
    "aria-label": p.ariaLabel ?? "Kopieren",
    class: p.class,
    variant: p.variant ?? ("outline" as ButtonVariant),
    size: p.size,
  })

  return (
    <span aria-live="polite" class="inline-flex">
      {p.label ? (
        <Button type="button" {...buttonProps()} onClick={() => void state.copy()}>
          {state.copied() ? state.copiedLabel() : p.label}
        </Button>
      ) : (
        <ButtonIconOnly
          type="button"
          title={state.copied() ? state.copiedLabel() : (p.ariaLabel ?? "Kopieren")}
          aria-label={p.ariaLabel ?? "Kopieren"}
          variant={p.variant ?? "ghost"}
          size="none"
          iconClass="size-4"
          class={cn("size-8 rounded-control hover:bg-surface-muted", p.class)}
          icon={state.copied() ? mdiCheck : mdiContentCopy}
          onClick={() => void state.copy()}
        />
      )}
    </span>
  )
}
