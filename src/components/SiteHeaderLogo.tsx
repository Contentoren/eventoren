import { Link } from "@tanstack/solid-router"

export function SiteHeaderLogo(props: { class?: string } = {}) {
  return (
    <Link
      to="/"
      class={`focus-ring flex shrink-0 items-center rounded-control transition-opacity hover:opacity-90 ${props.class ?? ""}`}
      aria-label="Eventoren – zur Startseite"
    >
      <img
        src="/eventoren-logo-light.png"
        alt="Eventoren"
        width="1024"
        height="206"
        decoding="async"
        class="h-7 w-auto max-md:h-5 sm:h-8"
      />
    </Link>
  )
}
