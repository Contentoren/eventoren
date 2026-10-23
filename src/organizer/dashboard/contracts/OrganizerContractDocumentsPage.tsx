import { For } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

/** Public contract documents; the route renders this inside SiteFrame. */
export function OrganizerContractDocumentsPage() {
  return (
    <main id="content" tabindex="-1" lang="de" class="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div class="mx-auto flex max-w-3xl flex-col gap-6">
        <LinkTextInternal
          to="/"
          class="mb-2 inline-flex rounded-control text-sm font-medium text-content-muted transition-colors hover:text-brand-strong"
        >
          ← Zurück zur Startseite
        </LinkTextInternal>
        <header>
          <p class="mb-3 text-xs font-semibold tracking-widest text-brand-strong uppercase">Rechtliches</p>
          <h1 class="text-2xl font-bold tracking-tight text-content">Veranstalter-Verträge</h1>
        </header>
        <For each={[organizerContractDocuments.terms, organizerContractDocuments.dpa]}>
          {(document) => (
            <CardWrapper id={document.documentId} class="flex scroll-mt-24 flex-col gap-4">
              <div class="flex flex-col gap-4">
                <h2 class="text-xl font-semibold text-content">{document.title}</h2>
                <dl class="flex flex-col gap-1 text-sm">
                  <div class="flex gap-2">
                    <dt class="text-content-muted">Dokument</dt>
                    <dd class="text-content">{document.documentId}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="text-content-muted">Revision</dt>
                    <dd class="text-content">{document.revision}</dd>
                  </div>
                </dl>
                <For each={document.sections}>
                  {(section) => (
                    <section class="flex flex-col gap-1">
                      <h3 class="font-semibold text-content">{section[0]}</h3>
                      <p class="text-content">{section[1]}</p>
                    </section>
                  )}
                </For>
              </div>
            </CardWrapper>
          )}
        </For>
      </div>
    </main>
  )
}
