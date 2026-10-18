import Popover from "@corvu/popover"
import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { For, Match, Show, Switch } from "solid-js"
import {
  type ButtonSize,
  buttonSize,
  type ButtonVariant,
  buttonVariant,
  buttonCva2,
  buttonCvaIconOnly,
} from "#ui/interactive/button/buttonCva.js"
import { buttonIconCva } from "#ui/interactive/button/buttonIconCva.js"
import { classesButtonClickAnimation } from "#ui/interactive/button/classesButtonClickAnimation.js"
import { dropdownMenuStateCreate } from "#ui/interactive/menu/dropdownMenuStateCreate.js"
import { classesPopoverContentMerge } from "#ui/interactive/popover/classesPopoverContent.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type DropdownMenuItemEntry = {
  type: "item"
  id: string
  label: string
  icon?: string
  onSelect: () => void
  tone?: "danger"
  disabled?: boolean
  hint?: string
}

export type DropdownMenuSeparatorEntry = { type: "separator" }

export type DropdownMenuLabelEntry = { type: "label"; label: string }

export type DropdownMenuEntry = DropdownMenuItemEntry | DropdownMenuSeparatorEntry | DropdownMenuLabelEntry

export type DropdownMenuProps = MayHaveClass & {
  items: DropdownMenuEntry[]
  triggerLabel?: string
  triggerIcon?: string
  triggerAriaLabel?: string
  triggerVariant?: ButtonVariant
  triggerSize?: ButtonSize
  align?: "start" | "end"
}

/** Popover menu with keyboard navigation (arrows/Home/End/Enter/Escape). */
export function DropdownMenu(p: DropdownMenuProps) {
  const state = dropdownMenuStateCreate({ items: () => p.items })
  const variant = () => p.triggerVariant ?? buttonVariant.outline
  const size = () => p.triggerSize ?? buttonSize.sm
  const placement = () => (p.align === "start" ? "bottom-start" : "bottom-end")
  const iconOnly = () => !p.triggerLabel && !!p.triggerIcon
  const menuName = () => p.triggerAriaLabel ?? p.triggerLabel ?? "Menü"

  return (
    <Popover
      placement={placement()}
      floatingOptions={{ offset: 8, flip: true, shift: true }}
      open={state.open()}
      onOpenChange={state.handleOpenChange}
    >
      <Show
        when={iconOnly()}
        fallback={
          <Popover.Trigger
            class={buttonCva2(variant(), size(), classesButtonClickAnimation, p.class)}
            aria-label={p.triggerAriaLabel}
            aria-haspopup="menu"
            aria-expanded={state.open()}
            ref={state.registerTrigger}
            onKeyDown={state.handleTriggerKeyDown}
          >
            {p.triggerIcon && <Icon path={p.triggerIcon} class={buttonIconCva(variant(), "mr-2")} />}
            <span>{p.triggerLabel}</span>
            <Icon path={mdiChevronDown} class={buttonIconCva(variant(), "ml-1 size-4")} />
          </Popover.Trigger>
        }
      >
        <Popover.Trigger
          class={buttonCvaIconOnly(variant(), false, false, classesButtonClickAnimation, p.class)}
          title={p.triggerAriaLabel ?? p.triggerLabel}
          aria-label={p.triggerAriaLabel ?? p.triggerLabel}
          aria-haspopup="menu"
          aria-expanded={state.open()}
          ref={state.registerTrigger}
          onKeyDown={state.handleTriggerKeyDown}
        >
          <Icon path={p.triggerIcon ?? ""} class={buttonIconCva(variant(), "")} />
        </Popover.Trigger>
      </Show>
      <Popover.Portal>
        <Popover.Content
          class={classesPopoverContentMerge("min-w-[200px] p-1")}
          ref={state.registerMenu}
          role="menu"
          aria-label={menuName()}
        >
          <For each={p.items}>
            {(entry, index) => (
              <Switch>
                <Match when={entry.type === "separator" && index() > 0}>
                  <div role="separator" class="mx-2 my-1 h-px bg-border-subtle" />
                </Match>
                <Match when={entry.type === "label"}>
                  <div class="px-3 pb-1 pt-2 text-xs font-semibold text-content-muted">
                    {(entry as DropdownMenuLabelEntry).label}
                  </div>
                </Match>
                <Match when={entry.type === "item"}>
                  {(() => {
                    const item = entry as DropdownMenuItemEntry
                    return (
                      <button
                        type="button"
                        role="menuitem"
                        data-dropdown-item-id={item.id}
                        disabled={item.disabled}
                        class={classMerge(
                          "flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-content",
                          "focus-visible:outline-2 focus-visible:outline-ring",
                          state.isActive(item.id) && "bg-surface-muted",
                          item.tone === "danger" && !item.disabled ? "text-danger dark:text-red-300" : "text-content",
                          item.disabled && "cursor-not-allowed opacity-50",
                        )}
                        onClick={() => state.activateItem(item.id)}
                        onKeyDown={(event) => state.handleItemKeyDown(event, item.id)}
                        onMouseEnter={() => state.setActiveItem(item.id)}
                        onFocus={() => state.setActiveItem(item.id)}
                      >
                        {item.icon && <Icon path={item.icon} class="size-4 shrink-0" />}
                        <span class="truncate">{item.label}</span>
                        {item.hint && <span class="ml-auto pl-4 text-xs text-content-muted">{item.hint}</span>}
                      </button>
                    )
                  })()}
                </Match>
              </Switch>
            )}
          </For>
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  )
}
