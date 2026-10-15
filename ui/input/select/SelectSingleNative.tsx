import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { Key } from "@solid-primitives/keyed"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesDisabledDirectly } from "#ui/classes/classesDisabledDirectly.js"
import type { SelectSingleNativeTexts } from "#ui/input/select/SelectSingleNativeTexts.js"
import { selectSingleNativeTextDefault } from "#ui/input/select/SelectSingleNativeTexts.js"
import { classArr } from "#ui/utils/classArr.js"
import type { HasGetOptions } from "#ui/utils/HasGetOptions.js"
import type { HasValueSignalString } from "#ui/utils/HasValueSignalString.js"
import type { MayHaveValueText } from "#ui/utils/HasValueText.js"
import type { MayHaveChildren } from "#ui/utils/MayHaveChildren.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import type { MayHaveDisabled } from "#ui/utils/MayHaveDisabled.js"
import type { MayHaveId } from "#ui/utils/MayHaveId.js"

export type StringStringFn = (value: string) => string

export interface SelectSingleNativeProps
  extends HasValueSignalString,
    HasGetOptions,
    MayHaveValueText,
    MayHaveClass,
    MayHaveId,
    MayHaveChildren,
    MayHaveDisabled {
  texts?: SelectSingleNativeTexts
}

/** Native dropdown selecting a single signal-bound value. */
export function SelectSingleNative(p: SelectSingleNativeProps) {
  const texts = p.texts ?? selectSingleNativeTextDefault

  return (
    <div class="relative w-full min-w-0">
      <select
        id={p.id}
        class={classArr(
          "block w-full appearance-none p-2.5 pr-10",
          "text-content", // text
          "placeholder:text-muted-foreground", // text placeholder
          "bg-surface-muted", // bg
          "rounded-lg border border-input", // border
          "focus:ring-ring focus:border-ring",
          p.disabled && classesDisabledDirectly,
          p.class,
        )}
        value={p.valueSignal.get()}
        onChange={(e) => onChange(e, p)}
        disabled={p.disabled}
      >
        <Key each={p.getOptions()} by={(item) => item} fallback={<NoItems texts={texts} />}>
          {(getItem) => <SelectItem itemValue={getItem()} valueText={p.valueText} />}
        </Key>
      </select>
      <Icon
        path={mdiChevronDown}
        class={classArr(
          "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-content",
          p.disabled && "opacity-70",
        )}
      />
    </div>
  )
}

function onChange(
  e: Event & {
    currentTarget: HTMLSelectElement
    target: HTMLSelectElement
  },
  p: SelectSingleNativeProps,
): void {
  p.valueSignal.set(e.currentTarget.value)
}

interface NoItemsProps extends MayHaveClass {
  texts: SelectSingleNativeTexts
}

function NoItems(p: NoItemsProps) {
  return <div class={p.class}>{p.texts.noEntries}</div>
}

interface SelectItemProps extends MayHaveClass {
  itemValue: string
  valueText?: StringStringFn
}

function SelectItem(p: SelectItemProps) {
  return (
    <option value={p.itemValue} class={classArr("bg-surface text-content", p.class)}>
      {getDisplayValue(p.itemValue, p.valueText)}
    </option>
  )
}

function getDisplayValue(itemValue: string, valueText?: StringStringFn) {
  if (!valueText) return itemValue
  const hasValue = valueText(itemValue)
  if (!hasValue) return itemValue
  return hasValue
}
