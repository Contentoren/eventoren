# Shared cookie authentication

The HttpOnly application session cookie is authoritative for authenticated server operations. Browser calls use typed same-origin server functions; they do not choose arbitrary backend operations. Root auth state exposes only an allowlisted identity and readiness, never a session token, and server-side identity remains request-scoped rather than process-global. Backend role authorization must still be checked for every protected operation; shared identity state is not an authorization cache.

Legacy browser session data may be adopted only when there is no valid cookie identity and is not an alternative credential source for normal authenticated operations. Logout clears shared client identity only after the server logout succeeds. Guest ticket access remains independent of authenticated account state.
