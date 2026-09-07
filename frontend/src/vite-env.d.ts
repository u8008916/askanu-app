/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The App integration boundary the browser posts to. Empty or unset means
   * same origin, which the dev proxy and later the App service both serve.
   */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Dev only. `1` selects the mock transport instead of the real client, so the
   * response states can be exercised without the RAG service running.
   */
  readonly VITE_USE_MOCK_TRANSPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
