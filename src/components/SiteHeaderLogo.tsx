import { Link } from "@tanstack/solid-router"
import { classMerge } from "../ui/classMerge.ts"

export function SiteHeaderLogo(props: { class?: string; href?: string } = {}) {
  const content = () => (
    <img
      src="/eventoren-logo-light.png"
      alt="Eventoren"
      width="1024"
      height="206"
      decoding="async"
      class="h-7 w-auto max-md:h-5 sm:h-8"
    />
  )
  const className = classMerge(
    "focus-ring flex shrink-0 items-center rounded-control transition-opacity hover:opacity-90",
    props.class,
  )

  return props.href ? (
    <a href={props.href} class={className} aria-label="Eventoren – zur Startseite">
      {content()}
    </a>
  ) : (
    <Link to="/" class={className} aria-label="Eventoren – zur Startseite">
      {content()}
    </Link>
  )
}
