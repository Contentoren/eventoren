import { Link } from "@tanstack/solid-router"

export function SiteHeaderLogo(props: { class?: string } = {}) {
  return (
    <Link
      to="/"
      class={`eventoren-logo-shell focus-ring flex shrink-0 items-center rounded-control px-space-2 py-space-1 ${props.class ?? ""}`}
      aria-label="Eventoren – zur Startseite"
    >
      <img
        src="/eventoren-logo.png"
        alt="Eventoren"
        width="1024"
        height="206"
        decoding="async"
        class="h-7 w-auto max-md:h-5 sm:h-8"
      />
    </Link>
  )
}
