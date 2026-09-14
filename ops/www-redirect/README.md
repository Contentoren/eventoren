# WWW redirect

The normal Cloudflare Pages deployment adds `www.eventoren.contentoren.de` as a custom-domain alias of the
`eventoren` Pages project and provisions its proxied CNAME to `eventoren.pages.dev`.
The Pages alias provides TLS coverage. SSR output redirects only the exact `www.eventoren.contentoren.de` hostname in
the generated worker with HTTP 301 while preserving path and query; the standalone Pages artifact uses
the equivalent hostname-scoped `_redirects` rule for SSG deployments.

No Cloudflare zone Redirect Ruleset permission is required. Only the exact nested WWW hostname is
reconciled; the existing root WWW, API, and Convex hostnames are not changed.

The generated `src/www-redirect/_redirects` artifact and separate redirect project scripts for
`eventoren-www-redirect` remain available for explicit standalone use, but the normal lifecycle does not
move the hostname to that project. After a normal production deployment, verify the recipe-owned state:

1. `bun run www-redirect:check`
2. `bun run www-redirect:verify`
