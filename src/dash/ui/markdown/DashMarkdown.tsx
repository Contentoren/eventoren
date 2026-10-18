import { For } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"
import { dashMarkdownParse } from "#src/dash/model/dashMarkdownParse.ts"
import type { DashMdInline } from "#src/dash/model/dashMdInline.ts"

function dashMarkdownInlinesStateCreate(inlines: DashMdInline[]) {
  return () => inlines
}

function DashMarkdownInline(props: { inlines: DashMdInline[] }) {
  return (
    <For each={dashMarkdownInlinesStateCreate(props.inlines)()}>
      {(inline) => {
        if (inline.type === "text") return <>{inline.text}</>
        if (inline.type === "break") return <br />
        if (inline.type === "bold") {
          return (
            <strong>
              <DashMarkdownInline inlines={inline.children} />
            </strong>
          )
        }
        if (inline.type === "italic") {
          return (
            <em>
              <DashMarkdownInline inlines={inline.children} />
            </em>
          )
        }
        return (
          <a
            href={inline.href}
            target="_blank"
            rel="noopener noreferrer"
            class="text-brand underline-offset-2 hover:underline"
          >
            <DashMarkdownInline inlines={inline.children} />
          </a>
        )
      }}
    </For>
  )
}

export function DashMarkdown(props: { text: string; class?: string; size?: "sm" | "md" }) {
  const blocks = () => dashMarkdownParse(props.text)

  return (
    <div class={classMerge("flex flex-col gap-2", props.size === "sm" ? "text-sm" : "text-sm", props.class)}>
      <For each={blocks()}>
        {(block) => {
          if (block.type === "heading") {
            return block.level === 2 ? (
              <h2 class="text-lg font-semibold text-content">
                <DashMarkdownInline inlines={block.inlines} />
              </h2>
            ) : (
              <h3 class="text-base font-semibold text-content">
                <DashMarkdownInline inlines={block.inlines} />
              </h3>
            )
          }
          if (block.type === "list") {
            return block.ordered ? (
              <ol class="list-decimal space-y-1 pl-5 text-content">
                <For each={block.items}>
                  {(item) => (
                    <li>
                      <DashMarkdownInline inlines={item} />
                    </li>
                  )}
                </For>
              </ol>
            ) : (
              <ul class="list-disc space-y-1 pl-5 text-content">
                <For each={block.items}>
                  {(item) => (
                    <li>
                      <DashMarkdownInline inlines={item} />
                    </li>
                  )}
                </For>
              </ul>
            )
          }
          return (
            <p class="leading-relaxed text-content">
              <DashMarkdownInline inlines={block.inlines} />
            </p>
          )
        }}
      </For>
    </div>
  )
}
