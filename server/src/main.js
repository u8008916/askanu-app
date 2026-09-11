import { loadConfig } from './config.js';
import { createServer, log } from './server.js';

/**
 * Process entry point.
 *
 * Kept separate from `server.js` so the tests import a server factory and bind
 * their own ephemeral port, rather than racing a module that listens on import.
 *
 * `loadConfig` throws when `RAG_SERVICE_URL` is missing, which crashes the
 * process here on purpose: a Cloud Run revision that cannot reach RAG should
 * fail its deployment loudly instead of serving 502s.
 */
const config = loadConfig();

createServer(config).listen(config.port, () => {
  log({
    event: 'listening',
    port: config.port,
    environment: config.environment,
    upstream: config.ragServiceUrl,
    auth: config.authEnabled ? 'identity-token' : 'disabled',
  });
});
