import { createFileRoute, Link } from "@tanstack/solid-router"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/support")({
  head: () => seoHeadCreate("/support"),
  component: SupportPage,
})

function SupportPage() {
  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer width="narrow" class="flex flex-col gap-space-6 py-space-7">
          <header class="flex flex-col gap-space-2">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Support</h1>
            <p class="text-content-muted">
              Bei Fragen zu Eventoren, deinen Tickets oder deiner Buchung kannst du uns kontaktieren.
            </p>
          </header>
          <CardWrapper class="flex flex-col gap-space-4">
            <h2 class="text-lg font-semibold">Kontaktmöglichkeiten</h2>
            <dl class="flex flex-col gap-space-4">
              <div>
                <dt class="font-semibold">E-Mail</dt>
                <dd>
                  <a href="mailto:kontakt@eventoren.de" class="focus-ring rounded-control underline">
                    kontakt@eventoren.de
                  </a>
                </dd>
              </div>
              <div>
                <dt class="font-semibold">Telefon</dt>
                <dd>
                  <a href="tel:+493058849210" class="focus-ring rounded-control underline">
                    +49 30 58849210
                  </a>
                </dd>
              </div>
            </dl>
            <p>
              Du kannst auch unser{" "}
              <Link to="/kontakt" class="focus-ring rounded-control underline">
                Kontaktformular
              </Link>{" "}
              nutzen.
            </p>
          </CardWrapper>
          <section class="flex flex-col gap-space-2" aria-labelledby="support-address">
            <h2 id="support-address" class="text-lg font-semibold">
              Postanschrift des Betreibers
            </h2>
            <address class="not-italic">
              Semesterkur UG (haftungsbeschränkt)
              <br />
              Ernst-Weyden-Straße 15
              <br />
              51105 Köln
            </address>
          </section>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
