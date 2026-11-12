/**
 * Address of the optional AI explanation proxy (the Cloudflare Worker in /worker), e.g.
 * "https://late-bloomers-explain.<account>.workers.dev/explain". Empty means the AI
 * layer is switched off and the app shows its own deterministic explanation instead.
 * When this is set, the same origin must be added to connect-src in index.html.
 */
export const EXPLAIN_ENDPOINT = ''
