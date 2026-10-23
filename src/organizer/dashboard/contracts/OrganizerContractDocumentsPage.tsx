import { For } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"

/** Static HTML: readable without authentication, client state, or browser globals. */
export function OrganizerContractDocumentsPage() {
  return (
    <main class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 class="text-2xl font-semibold">Veranstalter-Verträge</h1>
      <p
        role="note"
        class="rounded-md bg-warning-soft px-4 py-3 text-sm text-warning dark:bg-warning-soft/20 dark:text-amber-200"
      >
        Noch nicht anwaltlich geprüft — keine Rechtsberatung. Vor produktivem Einsatz rechtlich prüfen lassen.
      </p>
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
    </main>
  )
}
