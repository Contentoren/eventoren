import { cn } from "cn"
import { createUniqueId, Show } from "solid-js"
import { imageDropStateCreate } from "#ui/input/image/imageDropStateCreate.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type ImageDropProps = MayHaveClass & {
  value: string | null
  onChange: (dataUrl: string | null) => void
  maxSize?: number
  aspect?: "square" | "16:9" | "free"
  shape?: "rounded" | "circle"
  label?: string
  hint?: string
}

const aspectClass = {
  square: "aspect-square",
  "16:9": "aspect-video",
  free: "",
} as const

const shapeClass = {
  rounded: "rounded-control",
  circle: "rounded-full",
} as const

/** Click or drag & drop image upload; downscales to a webp data URL. */
export function ImageDrop(p: ImageDropProps) {
  const state = imageDropStateCreate({
    maxSize: () => p.maxSize ?? 512,
    aspect: () => p.aspect ?? "free",
    onChange: (next) => p.onChange(next),
  })
  const inputId = createUniqueId()
  const hintId = `${inputId}-hint`

  const frameClass = () =>
    cn(
      shapeClass[p.shape ?? "rounded"],
      aspectClass[p.aspect ?? "free"],
      "focus-visible:outline-2 focus-visible:outline-ring",
    )

  return (
    <div class={p.class}>
      <Show when={p.label}>
        <label for={inputId} class="mb-1.5 block text-sm font-medium text-content">
          {p.label}
        </label>
      </Show>
      <Show
        when={p.value}
        fallback={
          <div
            role="button"
            tabIndex={0}
            aria-label={p.label ?? "Bild hochladen"}
            aria-describedby={p.hint ? hintId : undefined}
            class={cn(
              "flex w-full cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-4 py-8 text-center transition-colors",
              "border-border-subtle bg-surface text-content-muted hover:border-brand hover:text-content",
              state.dragging() && "border-brand bg-brand-soft/40 text-content",
              frameClass(),
            )}
            onClick={() => state.openPicker()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                state.openPicker()
              }
            }}
            onDragOver={state.handleDragOver}
            onDragLeave={state.handleDragLeave}
            onDrop={state.handleDrop}
          >
            <Icon path={state.dropIcon()} class="size-8" />
            <span class="text-sm font-medium">Bild hierher ziehen oder klicken</span>
            <span class="text-xs">JPG, PNG, WebP oder GIF · max. 10 MB</span>
          </div>
        }
      >
        <div class={cn("relative overflow-hidden border border-border-subtle bg-surface-muted", frameClass())}>
          <img
            src={p.value ?? ""}
            alt={p.label ? `Vorschau: ${p.label}` : "Hochgeladenes Bild"}
            class="size-full object-cover"
            draggable={false}
          />
          <div class="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
            <Button type="button" variant="outline" size="sm" onClick={() => state.openPicker()}>
              <Icon path={state.changeIcon()} class="mr-1.5 size-4" />
              Ändern
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-danger dark:text-red-300"
              onClick={() => p.onChange(null)}
            >
              <Icon path={state.removeIcon()} class="mr-1.5 size-4" />
              Entfernen
            </Button>
          </div>
        </div>
      </Show>
      <Show when={p.hint}>
        <p id={hintId} class="mt-1.5 text-xs text-content-muted">
          {p.hint}
        </p>
      </Show>
      <Show when={state.error()}>
        <p role="alert" class="mt-1.5 text-xs text-danger dark:text-red-300">
          {state.error()}
        </p>
      </Show>
      <input
        ref={state.registerInput}
        id={inputId}
        type="file"
        accept="image/*"
        class="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={state.handleFileInput}
      />
    </div>
  )
}
