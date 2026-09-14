import { Link } from "@tanstack/solid-router"

export function Footer() {
  return (
    <footer class="border-t p-4 text-sm">
      <nav aria-label="Legal">
        <Link to="/impressum" class="mr-4 underline">
          Impressum
        </Link>
        <Link to="/datenschutz" class="mr-4 underline">
          Datenschutz
        </Link>
        <Link to="/terms" class="mr-4 underline">
          Terms
        </Link>
        <Link to="/privacy" class="mr-4 underline">
          Privacy
        </Link>
      </nav>
    </footer>
  )
}
