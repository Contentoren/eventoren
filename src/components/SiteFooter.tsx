import { Link } from "@tanstack/solid-router"

type SiteFooterHref = "/impressum" | "/agb" | "/datenschutz" | "/kontakt" | "/support" | "/ratgeber" | "/en/guides"

export function SiteFooter(props: { readonly linkHref?: (href: string) => string } = {}) {
  const link = (
    href: SiteFooterHref,
    label: string,
    options: { readonly className?: string; readonly lang?: string } = {},
  ) => {
    const className = options.className ?? "focus-ring rounded-control transition-colors hover:text-content"
    return props.linkHref ? (
      <Link to={props.linkHref(href)} class={className} lang={options.lang} hreflang={options.lang}>
        {label}
      </Link>
    ) : (
      <Link
        to={href}
        class="focus-ring rounded-control transition-colors hover:text-content"
        lang={options.lang}
        hreflang={options.lang}
      >
        {label}
      </Link>
    )
  }

  return (
    <footer class="relative z-10 border-t border-border-subtle bg-surface">
      <div class="mx-auto flex max-w-6xl flex-col flex-wrap items-center justify-center gap-3 px-6 py-8 text-center text-sm text-content-muted sm:flex-row sm:gap-x-6">
        <p>© Eventoren</p>
        <nav class="flex flex-wrap justify-center gap-4" aria-label="Ratgeber">
          {link("/ratgeber", "Ratgeber")}
          {link("/en/guides", "English guides", { lang: "en" })}
        </nav>
        <nav class="flex flex-wrap justify-center gap-4" aria-label="Rechtliche Informationen">
          {link("/impressum", "Impressum")}
          {link("/agb", "AGB")}
          {link("/datenschutz", "Datenschutz")}
          {link("/kontakt", "Kontakt", { className: "transition-colors hover:text-content" })}
          {link("/support", "Support")}
        </nav>
      </div>
    </footer>
  )
}
