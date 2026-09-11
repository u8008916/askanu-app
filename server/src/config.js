/**
 * App service configuration.
 *
 * V3_LOCKED_DECISIONS.md:24 puts this service between the browser and RAG:
 *
 *     Browser/React -> App service -> REST -> RAG service -> Cloud SQL/pgvector -> Gemini
 *
 * It therefore reads exactly one piece of config that matters: where RAG is.
 * It holds no database credential, no model key and no prompt, so there is
 * nothing here for Secret Manager to inject. `RAG_SERVICE_URL` is
 * deliberately not `VITE_`-prefixed: only `VITE_` values reach browser code, so
 * the service URL cannot leak into the bundle by accident.
 *
 * RAG is private on Cloud Run, so the outbound call carries an identity token
 * whose audience is the RAG service URL (see auth.js). That is on by default:
 * a deploy that forgets to configure anything is still authenticated. Local
 * development, where RAG is unauthenticated and there is no metadata server,
 * opts out with `RAG_AUTH_DISABLED=true`.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/** Cloud Run injects `PORT`; 8080 is both its default and our documented local port. */
const DEFAULT_PORT = 8080;

/**
 * Fails fast rather than per request. A revision started without an upstream
 * cannot serve anything useful, and a container that exits immediately is a
 * far clearer signal than one that answers every `/ask` with a 502.
 */
export function loadConfig(env = process.env) {
  const ragServiceUrl = (env.RAG_SERVICE_URL ?? '').trim().replace(/\/+$/, '');

  if (ragServiceUrl === '') {
    throw new Error(
      'RAG_SERVICE_URL is required. See .env.example and docs/DEPLOYMENT.md.',
    );
  }

  let parsed;
  try {
    parsed = new URL(ragServiceUrl);
  } catch {
    throw new Error('RAG_SERVICE_URL is not a valid URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('RAG_SERVICE_URL must be http or https.');
  }

  const port = Number.parseInt(env.PORT ?? '', 10);

  const authDisabled = TRUTHY.has((env.RAG_AUTH_DISABLED ?? '').trim().toLowerCase());

  return {
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PORT,
    ragServiceUrl,
    askUrl: `${ragServiceUrl}/api/v1/ask`,
    authEnabled: !authDisabled,
    // Cloud Run validates `aud` against the service URL, not a path under it.
    tokenAudience: ragServiceUrl,
    environment: (env.ASKANU_ENV ?? '').trim() || 'unknown',
  };
}
