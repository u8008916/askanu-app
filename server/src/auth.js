/**
 * Identity tokens for the App -> RAG call.
 *
 * RAG is a private Cloud Run service. Calling it needs a Google-signed OIDC
 * identity token for the App's own runtime service account, sent as
 * `Authorization: Bearer <token>`, with the RAG service URL as the audience.
 *
 * On Cloud Run the attached service account's credentials are served by the
 * instance metadata server, so obtaining a token is one local HTTP GET. That is
 * all `google-auth-library` would do here too, behind a dependency tree the
 * Day 26 scan would then have to justify — and `server.js` commits to zero
 * runtime dependencies. So the metadata server is called directly.
 *
 * This module never sees the request body, never logs, and never puts a token
 * anywhere but the returned promise. A failed fetch throws a generic error with
 * no response text attached, so nothing from Google can leak into an envelope.
 */

export const METADATA_IDENTITY_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity';

/**
 * The metadata server is node-local and answers in milliseconds; a hang here
 * must not consume the request budget. 2 s plus the 32 s upstream timeout in
 * server.js still finishes inside the browser's 35 s abort
 * (frontend/src/chat/askApi.ts).
 */
export const TOKEN_FETCH_TIMEOUT_MS = 2_000;

/** Renew this long before the token's `exp`, so an in-flight call never carries a token that expires mid-request. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** If `exp` cannot be read, assume the shortest lifetime Google issues minus the margin. */
const FALLBACK_LIFETIME_MS = 45 * 60 * 1000;

export class TokenAcquisitionError extends Error {
  constructor() {
    super('Identity token could not be obtained.');
    this.name = 'TokenAcquisitionError';
  }
}

/**
 * Reads `exp` from the JWT payload without verifying the signature — this
 * service is the bearer, not the audience, so verification is RAG's job. The
 * metadata server returns its own cached tokens, which may already be close to
 * expiry when first seen, so a fixed TTL from our first fetch would be wrong.
 */
export function tokenExpiry(token, now) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const exp = JSON.parse(json).exp;

    if (Number.isFinite(exp)) {
      return exp * 1000 - EXPIRY_MARGIN_MS;
    }
  } catch {
    // Fall through to the conservative default.
  }

  return now + FALLBACK_LIFETIME_MS;
}

/**
 * Returns `async () => token` for the given audience.
 *
 * `fetchImpl` and `now` exist so tests can point this at a stub metadata server
 * and move the clock, without touching GCP or a real signing key.
 */
export function createMetadataTokenProvider({ audience, fetchImpl = fetch, now = Date.now }) {
  let cached = null;
  let inFlight = null;

  async function acquire() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);
    const url = `${METADATA_IDENTITY_URL}?audience=${encodeURIComponent(audience)}`;

    try {
      const response = await fetchImpl(url, {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new TokenAcquisitionError();
      }

      const token = (await response.text()).trim();

      if (token === '') {
        throw new TokenAcquisitionError();
      }

      return token;
    } catch {
      // Whatever the cause — refused, timed out, non-2xx, empty — the caller
      // gets one generic error. The original message may carry a URL or a
      // Google diagnostic and must not travel further.
      throw new TokenAcquisitionError();
    } finally {
      clearTimeout(timer);
    }
  }

  return async function getIdToken() {
    const current = now();

    if (cached !== null && current < cached.expiresAt) {
      return cached.token;
    }

    // Single-flight: concurrent cold-start requests share one metadata call.
    if (inFlight === null) {
      inFlight = acquire()
        .then((token) => {
          cached = { token, expiresAt: tokenExpiry(token, now()) };
          return token;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    return inFlight;
  };
}

/** Used when `RAG_AUTH_DISABLED` is set: local RAG is unauthenticated and there is no metadata server. */
export const noAuthProvider = async () => null;
