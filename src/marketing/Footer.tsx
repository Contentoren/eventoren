import { Link } from "@tanstack/solid-router"

export function Footer(props: { readonly linkHref?: (href: string) => string } = {}) {
  const link = (href: string, label: string, className = "underline") =>
    props.linkHref ? (
      <a href={props.linkHref(href)} class={className}>
        {label}
      </a>
    ) : (
      <Link to={href as "/impressum" | "/datenschutz" | "/terms" | "/privacy" | "/support"} class={className}>
        {label}
      </Link>
    )

  return (
    <footer class="border-t p-4 text-sm">
      <nav aria-label="Rechtliche Informationen" class="flex flex-wrap gap-x-4 gap-y-2">
        {link("/impressum", "Impressum")}
        {link("/datenschutz", "Datenschutz")}
        {link("/terms", "AGB")}
        {link("/privacy", "Datenschutzerklärung")}
        {link("/support", "Support")}
      </nav>
    </footer>
  )
}
