# Contributing

Thanks for helping. This is a small static app, so the process is short.

1. `npm ci`, then `npm run dev`.
2. Make the change on a branch. Keep the pure logic in `src/lib/` and add a unit test
   there. User-facing text goes in **both** `src/i18n/bs.ts` and `src/i18n/en.ts`.
3. Before opening a pull request, run what CI runs:

   ```bash
   npm run lint && npm run typecheck && npm run test:coverage
   npm run build && npm run test:e2e
   ```

4. Open a pull request against `main`. Describe what a coach or analyst will see
   differently.

Ground rules: no backend, no tracking, no storing of squad data; the tool never labels a
child negatively; statistical claims in the app must come from `scripts/analyze.py` and
null results are reported.
