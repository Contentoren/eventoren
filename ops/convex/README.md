# Development Convex/Billing network path

The development Billing preview is the existing user service
`billing-preview.service` from the Billing project. It listens on
`127.0.0.1:3146`; Project Registry exposes the same service publicly as
`https://preview.billing.contentoren.de`.

Do not use that public hostname from development Convex actions. The rootless
Podman network uses pasta, and the public hostname hairpins through the host's
reverse proxy and back to a loopback-only service. That path is not reliable
from the Convex container.

`preview.container.in` therefore keeps rootless pasta networking but maps its
host-gateway address `169.254.1.2` to host loopback. This lets an action reach
the existing Billing systemd service at `http://169.254.1.2:3146` without a
bridge process or a public Billing port.

## Configuration

Set this in the private, ignored `.env.development` file:

```dotenv
EVENTOREN_BILLING_BASE_URL=http://169.254.1.2:3146
EVENTOREN_BILLING_ORGANIZATION_ID=<development Billing organization>
EVENTOREN_BILLING_API_CREDENTIAL=<development Billing organization credential>
EVENTOREN_BILLING_STRIPE_MODE=test
```

The organization credential is uploaded only to the self-hosted Convex
development deployment. Eventoren sends it as a server-side `Authorization`
header; it must not be a `VITE_*` variable, a browser value, a URL, or a
committed file.

## Apply and verify

From the Eventoren repository, after changing the private environment file:

```bash
bash ops/convex/preview.bash provision
bun run convex:deploy:development
bun run convex:env:upload:development
```

The provision command renders the Quadlet, reloads the user systemd manager,
and restarts the durable `eventoren-convex-preview.service`. It also preserves
the existing Project Registry routes. Verify the network path without sending
credentials in shell arguments:

```bash
systemctl --user is-active billing-preview.service
systemctl --user is-active eventoren-convex-preview.service
podman exec eventoren-convex-preview \
  curl -fsS -o /dev/null -w '%{http_code}\n' http://169.254.1.2:3146/login
curl -fsS https://eventoren-convex.leonardomora.de/version
curl -fsS -i https://eventoren-api.leonardomora.de/
```

The container request should return Billing's normal HTTP status (currently
`200` for `/login`). A catalog edit in the Eventoren admin flow should then
complete its scheduled push without any temporary bridge process. Checkout
actions use the same path and must reach Billing with the private bearer
credential.

## Production equivalence

Production Convex uses the private values
`EVENTOREN_BILLING_BASE_URL=https://billing.contentoren.de` and
`EVENTOREN_BILLING_STRIPE_MODE=live`. Preview's
`http://169.254.1.2:3146` is the container-local route to the existing Billing
preview service; `https://preview.billing.contentoren.de` is its public
equivalent, not a replacement for the internal route. No routing change is
needed.

The Billing dependency is deployed as the versioned tarball in
`vendor/billing-<version>.tgz`. Build and check it in Billing first, copy the
artifact into `vendor/`, update the exact `file:` version in `package.json` if
needed, and run `bun install`. Never silently overwrite a same-version
tarball: refresh with a version bump so Bun cannot reuse an old lock/cache
entry. The full refresh procedure is in
[`docs/ticket_checkout_backend.md`](../../docs/ticket_checkout_backend.md).
