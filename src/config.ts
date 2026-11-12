/**
 * Address of the optional AI explanation proxy (the Cloudflare Worker in /worker), e.g.
 * "https://late-bloomers-explain.<account>.workers.dev/explain". Setting it to an empty
 * string switches the AI layer off: the app then shows its own deterministic explanation
 * and makes no request. The same origin must be listed in connect-src in index.html.
 */
export const EXPLAIN_ENDPOINT = 'https://late-bloomers-explain.berbicanes6.workers.dev/explain'
