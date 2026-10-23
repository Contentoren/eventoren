import { mdiFormatBold } from "@adaptive-ds/mdi/mdiFormatBold.js"
import { mdiFormatHeader2 } from "@adaptive-ds/mdi/mdiFormatHeader2.js"
import { mdiFormatItalic } from "@adaptive-ds/mdi/mdiFormatItalic.js"
import { mdiFormatListBulleted } from "@adaptive-ds/mdi/mdiFormatListBulleted.js"
import { mdiLinkVariant } from "@adaptive-ds/mdi/mdiLinkVariant.js"
import { cn } from "cn"
import { createSignal, Show } from "solid-js"
import { DashMarkdown } from "#src/dash/ui/markdown/DashMarkdown.tsx"
import {
  type DashMarkdownEditResult,
  type DashMarkdownEditSelection,
  dashMarkdownEditToggleHeading,
  dashMarkdownEditToggleList,
  dashMarkdownEditWrapBold,
  dashMarkdownEditWrapItalic,
  dashMarkdownEditWrapLink,
} from "#src/dash/ui/markdown/dashMarkdownEditApply.ts"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function dashMarkdownEditorStateCreate(inputs: {
  value: () => string
  onChange: (value: string) => void
  maxLength: () => number | undefined
  rows: () => number
}) {
  const modeSignal = createSignalObject<"schreiben" | "vorschau">("schreiben")
  const [area, setArea] = createSignal<HTMLTextAreaElement | null>(null)

  const attachArea = (node: HTMLTextAreaElement) => setArea(node)

  const overMax = () => {
    const max = inputs.maxLength()
    if (max === undefined) return false
    return inputs.value().length > max
  }

  const applyEdit = (transform: (selection: DashMarkdownEditSelection) => DashMarkdownEditResult) => {
    const node = area()
    const current = inputs.value()
    const start = node?.selectionStart ?? current.length
    const end = node?.selectionEnd ?? current.length
    const result = transform({ value: current, start, end })
    inputs.onChange(result.value)
    const restore = () => {
      const target = area()
      if (!target) return
      target.focus()
      target.setSelectionRange(result.start, result.end)
    }
    if (typeof queueMicrotask === "function") queueMicrotask(restore)
    else restore()
  }

  return {
    modeSignal,
    attachArea,
    overMax,
    applyEdit,
    bold: () => applyEdit(dashMarkdownEditWrapBold),
    italic: () => applyEdit(dashMarkdownEditWrapItalic),
    heading: () => applyEdit(dashMarkdownEditToggleHeading),
    list: () => applyEdit(dashMarkdownEditToggleList),
    link: () => applyEdit(dashMarkdownEditWrapLink),
  }
}

export type DashMarkdownEditorState = ReturnType<typeof dashMarkdownEditorStateCreate>

export function DashMarkdownEditor(props: {
  value: string
  onChange: (value: string) => void
  label?: string
  id?: string
  placeholder?: string
  maxLength?: number
  rows?: number
  invalid?: boolean
}) {
  const state = dashMarkdownEditorStateCreate({
    value: () => props.value,
    onChange: props.onChange,
    maxLength: () => props.maxLength,
    rows: () => props.rows ?? 8,
  })

  const toolbarButtonClass = "rounded-control p-1.5 text-content-muted hover:bg-surface-muted hover:text-content"

  return (
    <div class="flex min-w-0 flex-col gap-2">
      <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div class="flex h-9 min-w-0 items-center gap-0.5" role="toolbar" aria-label="Formatierung">
          <ButtonIconOnly
            variant="ghost"
            icon={mdiFormatBold}
            title="Fett"
            aria-label="Fett"
            class={toolbarButtonClass}
            onClick={state.bold}
          />
          <ButtonIconOnly
            variant="ghost"
            icon={mdiFormatItalic}
            title="Kursiv"
            aria-label="Kursiv"
            class={toolbarButtonClass}
            onClick={state.italic}
          />
          <ButtonIconOnly
            variant="ghost"
            icon={mdiFormatHeader2}
            title="Überschrift"
            aria-label="Überschrift"
            class={toolbarButtonClass}
            onClick={state.heading}
          />
          <ButtonIconOnly
            variant="ghost"
            icon={mdiFormatListBulleted}
            title="Liste"
            aria-label="Liste"
            class={toolbarButtonClass}
            onClick={state.list}
          />
          <ButtonIconOnly
            variant="ghost"
            icon={mdiLinkVariant}
            title="Link"
            aria-label="Link"
            class={toolbarButtonClass}
            onClick={state.link}
          />
        </div>
        <SegmentedControl
          value={state.modeSignal.get()}
          onChange={(value) => state.modeSignal.set(value === "vorschau" ? "vorschau" : "schreiben")}
          options={[
            { value: "schreiben", label: "Schreiben" },
            { value: "vorschau", label: "Vorschau" },
          ]}
          ariaLabel="Ansicht wählen"
          size="sm"
        />
      </div>
      <Show
        when={state.modeSignal.get() === "vorschau"}
        fallback={
          <Textarea
            ref={state.attachArea}
            id={props.id}
            aria-label={props.label}
            value={props.value}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            rows={props.rows ?? 8}
            aria-invalid={props.invalid === true ? "true" : undefined}
            onInput={(event) => props.onChange(event.currentTarget.value)}
            class={cn("h-10 text-sm rounded-control", props.invalid === true && "border-danger")}
          />
        }
      >
        <div class="min-h-20 rounded-control border border-border-subtle bg-surface-muted px-3 py-2">
          <DashMarkdown text={props.value} size="sm" />
        </div>
      </Show>
      <Show when={props.maxLength !== undefined}>
        <p class={`text-right text-xs tabular-nums ${state.overMax() ? "text-danger" : "text-content-muted"}`}>
          {props.value.length} / {props.maxLength}
        </p>
      </Show>
    </div>
  )
}
