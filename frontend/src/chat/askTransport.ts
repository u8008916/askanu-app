import type { AskRequest, AskResponse } from '../types/api';
import { askApi } from './askApi';
import { askMock } from '../dev/mockTransport';

/**
 * The transport seam.
 *
 * `useChatSession` depends on this type, not on any particular implementation.
 * Day 2 rendered every response state through the mock behind it; Day 3 put the
 * real `/api/v1/ask` client behind it without changing a single component.
 */
export type AskTransport = (
  request: AskRequest,
  signal?: AbortSignal,
) => Promise<AskResponse>;

/**
 * The transport the running app uses.
 *
 * The real client is the production path. The mock is opt-in, dev only, and
 * exists so the response states can be seen in a browser without the RAG
 * service running:
 *
 *     VITE_USE_MOCK_TRANSPORT=1 npm run dev
 *
 * Vite replaces both operands with literals at build time, so a production
 * build folds this to `askApi` and drops `mockTransport` — and the fixtures it
 * imports — from the bundle. Verified by grepping `dist/`, not assumed.
 */
export const askTransport: AskTransport =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_TRANSPORT === '1'
    ? askMock
    : askApi;
