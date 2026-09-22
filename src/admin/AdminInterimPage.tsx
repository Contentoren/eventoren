import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export function AdminInterimPage(props: { readonly title: string; readonly description: string }) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="py-10">
        <header class="mb-8 flex flex-col gap-3">
          <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Verwaltung</p>
          <h2 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{props.title}</h2>
        </header>
        <CardWrapper>
          <p class="text-sm leading-relaxed text-content-muted">{props.description}</p>
        </CardWrapper>
      </UiContainer>
    </main>
  )
}
