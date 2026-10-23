import { For } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { OrganizerPricingSummary } from "./OrganizerPricingSummary.tsx"

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
          <p class="mt-3 text-content-muted">
            Vertragspartner ist die Semesterkur UG (haftungsbeschränkt). Hier findest du den vollständigen
            Veranstaltervertrag mit Preisblatt und Verbraucherinformationen sowie die auf dem bisherigen AVV-Entwurf
            aufbauende Auftragsverarbeitungsvereinbarung.
          </p>
        </header>
        <nav aria-label="Vertragsnavigation" class="flex flex-wrap gap-3 print:hidden">
          <LinkButtonExternal href={`#${organizerContractDocuments.terms.documentId}`} variant="outline">
            Vertrag und Preisblatt
          </LinkButtonExternal>
          <LinkButtonExternal href={`#${organizerContractDocuments.dpa.documentId}`} variant="outline">
            AVV
          </LinkButtonExternal>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Drucken / als PDF speichern
          </Button>
        </nav>
        <p role="note" class="rounded-control border border-border-subtle bg-surface-muted p-4 text-sm">
          Vor dem Verkaufsstart müssen die konkrete Zahlungsanbindung, die Dienstleisterliste und die Betriebsnachweise
          zur AVV freigegeben sein. Der Vertragsabschluss allein ersetzt diese Freigabe nicht.
        </p>
        <OrganizerPricingSummary />
        <For each={[organizerContractDocuments.terms, organizerContractDocuments.dpa]}>
          {(document) => (
            <CardWrapper id={document.documentId} class="flex scroll-mt-24 flex-col gap-4">
              <div class="flex flex-col gap-4">
                <h2 class="text-xl font-semibold text-content">{document.title}</h2>
                <dl class="flex flex-col gap-1 text-sm">
                  <div class="flex gap-2">
                    <dt class="text-content-muted">Dokument</dt>
                    <dd class="min-w-0 break-words text-content">{document.documentId}</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="text-content-muted">Revision</dt>
                    <dd class="min-w-0 break-words text-content">{document.revision}</dd>
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
        <nav aria-label="Nächste Schritte" class="flex flex-wrap gap-4 print:hidden">
          <LinkButtonExternal href="/veranstalter/onboarding" variant="contrast">
            Zum Veranstalter-Onboarding
          </LinkButtonExternal>
          <LinkButtonExternal href="/veranstalter-vertrag-beenden" variant="outline">
            Vertrag widerrufen oder kündigen
          </LinkButtonExternal>
        </nav>
      </div>
    </main>
  )
}
