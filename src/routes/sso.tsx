import { createFileRoute } from "@tanstack/solid-router"
import { eventorenSsoSearchParse } from "#src/auth/model/eventorenSsoSearchParse.ts"
import { EventorenSsoPage } from "#src/auth/ui/EventorenSsoPage.tsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/sso")({
  validateSearch: eventorenSsoSearchParse,
  head: () => ({
    ...seoHeadCreate("/sso"),
    meta: [...seoHeadCreate("/sso").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <SiteFrame>
      <EventorenSsoPage returnTo={Route.useSearch()().returnTo} />
    </SiteFrame>
  ),
})
