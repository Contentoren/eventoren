import { Show } from "solid-js"

import { Button } from "#ui/interactive/button/Button.jsx"
import { dashMarkdownToPlain } from "../../../model/dashMarkdownToPlain.ts"
import { DashMarkdown } from "../../../ui/markdown/DashMarkdown.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"
import { DashSocialLinks } from "../../../ui/social/DashSocialLinks.tsx"
import type { DashProfilePageState } from "../dashProfilePageStateCreate.ts"

function dashProfilePreviewStateCreate(inputs: {
  form: () => DashProfilePageState["form"] extends never ? never : DashProfilePageState["form"]
}) {
  void inputs
  return {}
}

/** Klebrige Live-Vorschau der öffentlichen Profilkarte. */
export function DashProfilePreview(p: { state: DashProfilePageState }) {
  void dashProfilePreviewStateCreate
  const form = () => p.state.form.get()
  const socials = () => form()?.socials ?? { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" }
  const excerpt = () => {
    const text = form()?.description ?? ""
    if (text.trim().length === 0) return "Hier steht bald deine Geschichte."
    return dashMarkdownToPlain(text)
  }
  return (
    <aside aria-label="Vorschau" class="lg:sticky lg:top-24">
      <div class="overflow-hidden rounded-card border border-border-subtle bg-surface">
        <div class="bg-brand-soft px-5 pt-6 pb-10">
          <p class="text-xs font-medium tracking-wide text-content-muted uppercase">Vorschau</p>
        </div>
        <div class="px-5 pb-5">
          <div class="-mt-8 mb-3">
            <DashOrgLogo
              name={form()?.name ?? "?"}
              logoDataUrl={form()?.logoDataUrl ?? null}
              size="xl"
              shape="circle"
            />
          </div>
          <h2 class="text-lg font-semibold text-content">{form()?.name || "Dein Name"}</h2>
          <Show when={(form()?.subtitle ?? "").trim().length > 0}>
            <p class="mt-0.5 text-sm text-content-muted">{form()?.subtitle}</p>
          </Show>
          <div class="mt-3">
            <DashSocialLinks
              socials={socials()}
              website={(form()?.website ?? "").trim() || undefined}
              name={form()?.name || undefined}
              size="sm"
            />
          </div>
          <Show when={(form()?.website ?? "").trim().length > 0}>
            <div class="mt-3">
              <Button variant="outline" size="sm" disabled class="h-9 px-3 text-sm">
                Website ansehen
              </Button>
            </div>
          </Show>
          <div class="mt-3 text-sm text-content-muted">
            <Show when={(form()?.description ?? "").trim().length > 0} fallback={<p>{excerpt()}</p>}>
              <div class="line-clamp-3">
                <DashMarkdown text={form()?.description ?? ""} size="sm" />
              </div>
            </Show>
          </div>
        </div>
      </div>
    </aside>
  )
}
