import { Link } from "@tanstack/solid-router"

export function SiteFooter(props: { readonly linkHref?: (href: string) => string } = {}) {
  const link = (
    href: string,
    label: string,
    className = "focus-ring rounded-control transition-colors hover:text-content",
  ) =>
    props.linkHref ? (
      <a href={props.linkHref(href)} class={className}>
        {label}
      </a>
    ) : (
      <Link
        to={href as "/impressum" | "/agb" | "/kontakt"}
        class="focus-ring rounded-control transition-colors hover:text-content"
      >
        {label}
      </Link>
    )

  return (
    <footer class="relative z-10 border-t border-border-subtle bg-surface">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-content-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© Eventoren</p>
        <nav class="flex gap-4" aria-label="Rechtliche Informationen">
          {link("/impressum", "Impressum")}
          {link("/agb", "AGB")}
          {link("/kontakt", "Kontakt", "transition-colors hover:text-content")}
        </nav>
      </div>
    </footer>
  )
}
