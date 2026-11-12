# Late Bloomers

**Find the hidden talent your selection is missing.**

Live: https://berbicanes.github.io/hackathon/

In youth football, children are grouped by birth year. A child born in January can be
almost a full year older than a teammate born in December — taller, stronger, faster for
now. Coaches pick them, they get better coaching, and the late-born children are cut
before they have caught up. This is the **relative age effect (RAE)**.

Late Bloomers does two things:

The app is a guided 3-step flow (stepper in the header, one link per step: `#problem`,
`#squad`, `#decision`): **1 Problem → 2 Your squad → 3 Decision**. Plain language comes
first; the statistics sit in a collapsed "For analysts" section.

1. **Bias mirror** (step 1) — proves the effect on real data: 50,100 professional players from
   the public Transfermarkt dataset.
2. **Your squad** (steps 2 and 3) — a free tool for grassroots coaches. Upload your squad's assessment
   scores and see which children are being judged on age rather than ability, before you
   cut anyone.

For each child there is a plain-language **player card** ("6 months younger than the
squad average, top 32% for their age: take a second look, reassess in 6 months"), a
**"What your club can do on Monday"** panel with three no-cost actions, and a
**printable one-page squad fairness report**. The app is in **Bosnian** (default) and
**English**.

Everything that decides runs in the browser. **The uploaded squad file never leaves the
device**: no database, no accounts, no analytics. An optional "Objasni mi (AI)" button
sends only anonymous numbers (never names or birth dates) to get a plain-language
explanation; see [Architecture](#architecture-math-decides-ai-explains).

## Key findings

From `scripts/analyze.py` on the July 2026 snapshot (ages on 1 July 2026):

| | Result |
|---|---|
| Active under-21 professionals born Jan–Mar | **32.3%** (expected 24.7% by days), Oct–Dec only **18.4%** (n = 5,538, χ² = 234.9, p ≈ 1 × 10⁻⁵⁰) |
| Q1 vs Q4 among under-21 pros | Q1-born players are **1.8×** as common as Q4-born among under-21 pros (day-adjusted ratio 1.79) |
| All 50,100 players | Q1 32.5% vs Q4 18.2%, χ² = 2,374, p < 10⁻³⁰⁰ |
| Under-21, **excluding England** (1 Sept cut-off) | Q1 32.3% vs Q4 18.1%, ratio **1.81×** (n = 5,363, χ² = 233.8, p ≈ 2 × 10⁻⁵⁰): the headline holds |
| Under-21, excluding England, Wales and Japan | Q1 32.8% vs Q4 18.1%, ratio 1.84× (n = 5,213, p ≈ 1 × 10⁻⁵²) |
| **England under-21, 1 Sept cut-off** | Sep–Nov 28.6% vs Jun–Aug 18.9%, ratio 1.53×, but n = 175 and **p = 0.065: not significant on its own** |
| England, all 1,762 players, 1 Sept cut-off | Sep–Nov 33.0% vs Jun–Aug 15.9%, ratio 2.10×, p ≈ 8 × 10⁻²⁹ |
| Japan under-21, 1 April cut-off | Apr–Jun 37.2% vs Jan–Mar 15.3%, ratio 2.41× (n = 137, p = 0.0008) |
| "Underdog" check, age 22–25 | Q4-born players are worth more: median €700k vs €600k (Mann-Whitney p = 0.0007). **Holds** after Bonferroni correction |
| "Underdog" check, age 26–29 | Small Q4 edge (p = 0.029), same median €800k. **Does not hold** after Bonferroni correction, so not claimed |
| "Underdog" check, age 18–21 | **No difference** (p = 0.96) |

Three age bands were tested for the underdog check, so the Bonferroni-corrected threshold
is 0.05 ÷ 3 = 0.017. Only the 22–25 result passes it.

## Method

### Bias mirror (`scripts/analyze.py`)

- **Data**: `players.csv` from
  [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets)
  (public download linked in its README). The raw file is not committed.
- **Birth quarters** use the 1 January cut-off of UEFA youth football: Q1 = Jan–Mar …
  Q4 = Oct–Dec.
- **Expected distribution** is weighted by days per month (February = 28.25 days), not a
  flat 25% / 8.33%.
- **Chi-square goodness-of-fit** tests for quarters (df 3) and months (df 11), for all
  players, active players (last season ≥ 2024) and active under-21s.
- **Cut-off robustness**: England and Wales select by school year (1 September) and
  Japan by 2 April (approximated as 1 April, since the analysis works on whole months),
  so calendar quarters are the wrong ruler for them. The script re-runs the under-21 test
  without England, and without all three, and tests England and Japan separately with
  quarters counted from their own cut-off month. Country = `country_of_citizenship`.
- **Q1:Q4 ratio** = (observed / expected share for Q1) ÷ (same for Q4): how much more
  common Q1-born players are than Q4-born ones in the sample, adjusted for the number of
  days in each quarter. It describes who is in the professional pool; it is not an
  individual child's probability of becoming a professional.
- **Underdog check**: current market value of Q1- vs Q4-born active players, compared
  **within** age bands 18–21, 22–25 and 26–29 (never pooled, so age never drives the
  comparison) with a two-sided Mann-Whitney U test. Null results are reported. Because three
  bands are tested, each result is also judged against the Bonferroni threshold 0.017.
- The script uses only the Python standard library. The chi-square p-value comes from the
  regularised incomplete gamma function, checked against textbook critical values.

### Your squad (`src/lib/squad.ts`)

- **Age** in months at the assessment date.
- **Age-adjusted ("fair") score**: fit a straight line of score on age in months across
  the squad (ordinary least squares). A child's fair score is how far they sit above or
  below what is typical *for their exact age*, shifted back onto the original scale
  (residual + squad mean). If older children don't score higher, the adjustment changes
  almost nothing.
- **Recommendation: a second look, not a swap** (`recommendGroup`). The default advice
  keeps everyone in the raw top N and widens the group by the children who would be
  selected on the fair score, labelled "second look, reassess in 6 months". No child is
  shown as dropped. The raw vs age-adjusted swap is still available as a comparison.
- **"How it works" scatter plot**: each child as a dot (age in months on the test date
  against score), the fitted line labelled "expected for this age", one marker shape per
  birth quarter, hidden talents named. Children above the line are better than usual for
  their age. The same message is given as text for screen readers.
- **Reliability**: the slope comes with a 95% confidence interval (standard error from
  the residual variance, Student's t with n − 2 degrees of freedom), shown as
  "≈ 2.2 points per month, range 1.1–3.3". If the interval includes zero or the squad has
  fewer than 10 children, the app says the adjustment is only a rough guide.
- **Test direction**: for tests where a lower number is better (a sprint in seconds) the
  ranking, the adjustment, the chart and the texts all flip. "Better than expected for
  age" is always positive internally; the fair score stays on the original scale.
- **Selection-year start**: 1 January (default), 1 September (England, Wales) or 1 April
  (Japan). Birth quarters, badges, "early/late born" and the squad chart follow it; ages,
  ranks and fair scores do not depend on it.
- **One list of highlighted children.** The second-look list is the single source of
  truth: the recommendation, the names on the scatter plot, the "take a second look"
  player cards and the printed report show exactly the same children in the same order.
  A child who merely gains rank is not highlighted.
- **Borderline ("Na granici")**: the children right below the line, where the uncertainty
  of the estimate could swap the order. Walk down the age-adjusted ranking from just
  below the last place; a child qualifies while their gap to that place is at most the
  slope's 95% half-width times their age difference to the last selected child (two
  adjusted scores differ by Δscore − slope × Δage). Stop at the first child who does not
  qualify, and take at most three. The rule is monotonic: a lower-ranked child is never
  borderline while a higher-ranked one is not. Children already in the group on raw score
  are skipped. The headline counts both parts: "Widen the group by X places: Y late-born
  talents + Z borderline".
- **Player card** (`src/lib/playerCard.ts`): months younger/older than the squad
  average, standing for their age, raw vs fair rank, and one of four next steps: *take a
  second look*, *keep*, *look past size and speed*, *keep developing*. No negative
  labels, by design.
- **Synthetic sample**: 20 invented players with an early-skewed intake and a maturity
  bonus of 1.8 points per month of age. It is clearly labelled in the UI.

## Limitations

- Births are not perfectly uniform over the year; national seasonal patterns differ
  slightly from the day-weighted expectation.
- Transfermarkt covers professional players with a profile, mostly in Europe, not all
  footballers.
- **Cut-off dates.** The headline numbers use January–December quarters for every
  player, although England and Wales (1 September) and Japan (2 April) use other
  cut-offs. Checked: excluding England moves the under-21 ratio from 1.79× to 1.81×, and
  excluding all three to 1.84×, so the mixing slightly understates the effect rather than
  creating it. Countries are identified by citizenship, which is only a proxy for where a
  player was developed (an English-raised player with another passport stays in the main
  group), and other countries with unusual or changing cut-offs (e.g. the USA) are not
  separated.
- **England on its own is weak evidence at under-21.** With a 1 September cut-off the
  direction is the same (28.6% born Sep–Nov vs 18.9% Jun–Aug, 1.53×), but with only 175
  players it is not statistically significant (p = 0.065). The skew is clear only across
  all 1,762 English players in the data (2.10×, p ≈ 8 × 10⁻²⁹), which includes older and
  retired players. Wales has too few under-21 players (13) to test.
- Market value is an imperfect proxy for ability; the underdog effect is small, and only
  the 22–25 band survives correction for testing three age bands.
- The squad adjustment is a linear trend estimated from the squad itself. With fewer than
  about 10 players it is noisy, and the app says so. It is a prompt to take a second look,
  not a verdict on any child.

## Run locally

Requirements: Node 20+ and Python 3.10+.

```bash
npm ci
npm run dev        # http://localhost:5173/hackathon/
npm test           # unit tests (Vitest)
npm run test:coverage   # unit tests with a coverage floor
npm run lint
npm run build      # static site in dist/
npx playwright install chromium   # once
npm run test:e2e   # end-to-end journey against the built site (Playwright)
```

Regenerate the analysis:

```bash
mkdir -p data/raw
curl -L -o data/raw/players.csv.gz \
  https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz
gunzip data/raw/players.csv.gz
python3 scripts/analyze.py data/raw/players.csv   # writes public/data/rae.json
```

## Squad CSV format

```csv
name,birth_date,score
Player A,2014-02-14,72
Player B,2014-11-03,64
```

- Comma or semicolon separated. Dates as `2014-02-14` or `14.02.2014`.
- `score` is any assessment; decimal commas are accepted. Choose in the app whether a
  higher or a lower score is better.
- Files are limited to 200 KB and 300 players. Invalid rows are skipped and listed.

## Project layout

```
scripts/analyze.py        RAE analysis (standard library only)
public/data/rae.json      analysis output used by the Bias mirror
src/lib/                  pure logic + unit tests (squad, csv, playerCard, format)
src/components/           screens and UI pieces
src/i18n/                 Bosnian and English strings (one file per language)
worker/                   optional Cloudflare Worker: AI explanation proxy (schema, prompt, handler)
PITCH.md                  3-minute demo script and jury Q&A
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: lint → unit tests with a
coverage floor → build → end-to-end journey → deploy to GitHub Pages (Settings → Pages →
Source: GitHub Actions) → the same journey again as a smoke check against the live site. The site is fully static and is
served under `/hackathon/` (see `vite.config.ts`).

## Privacy and security

- The app has a short **Privacy page** in both languages (footer link, or
  `/hackathon/#privacy`). The only outside service is GitHub Pages hosting; fonts (Inter
  and Space Grotesk, SIL Open Font License) are self-hosted from `src/fonts/`.
- No cookies, no tracking. Squad files are read with the browser File API and analysed in
  memory. The only server component is the optional explanation Worker, which receives
  de-identified numbers on click and stores no request content.
- A strict Content-Security-Policy allows scripts, styles and fonts only from the site
  itself. The page makes no third-party requests.
- An error boundary shows a reload message instead of a blank page; errors stay in the
  browser console.
- Uploaded files are size- and row-limited and parsed defensively; exported CSV cells are
  protected against spreadsheet formula injection.

## Edge cases

The analysis is tested on **43 edge-case squads** (`tests/fixtures/edge-cases/`,
generated by `scripts/make_edge_cases.py`; all children invented). Every fixture is a file
as a coach might upload it, with a one-line description and the expected behaviour.
`src/lib/edgeCases.test.ts` runs each one through parsing, analysis, selection, the
recommendation, the data warnings, the player cards and the explanation payload, and
checks that nothing throws, every number is finite, ranks are complete, nobody is dropped
or listed twice, and the declared expectation holds. No test calls the AI.

Result: **13 passed** as they were, **9 fixed** (the app's behaviour changed), **21 handled
with a message** (the app already told the coach what happened).

| # | Case | Result | What the app does |
|---|---|---|---|
| 01 | All 12 children born in the same month | handled with message | Trend marked as not reliable; adjustment shown as a rough guide only. |
| 02 | All 10 children born on the same day | handled with message | No interval can be estimated; marked as not reliable, nobody added. |
| 03 | A squad of one child | handled with message | Loads; "add at least 4 players" message, nothing recommended. |
| 04 | A small squad of 2 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 05 | A small squad of 3 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 06 | A small squad of 4 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 07 | A small squad of 5 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 08 | A small squad of 6 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 09 | A small squad of 7 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 10 | A small squad of 8 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 11 | A small squad of 9 children with a clear age trend | handled with message | Analysed, with the notice that the adjustment is only a rough guide (fewer than 10 children). |
| 12 | 12 children, every score identical | fixed | Nobody is added when age has no effect, and the tie at the last place is flagged (before: children were added with no age effect behind it). |
| 13 | One score is an obvious typing error (9999) | fixed | The outlying score is flagged for the coach to check (before: it silently bent the age trend). |
| 14 | Younger children score higher (negative age trend) | fixed | Nobody is added and the coach is told older children do not score better here (before: older children were presented as "late-born talents"). |
| 15 | Sprint times in seconds, lower is better, older children faster | passed | Fastest child ranks first; adjustment works in the right direction. |
| 16 | Sprint times loaded with the default 'higher is better' setting | fixed | Same guard: nobody is added, and the message points to the test-direction setting. |
| 17 | Two children share the score at the last selected place | fixed | The tie is flagged; the alphabetical order is no longer presented as a ranking. |
| 18 | Three children share the score at the last selected place | fixed | The tie is flagged with the number of children involved. |
| 19 | More places than children | passed | Everyone is kept; nobody to add. |
| 20 | Scores include zero and negative numbers | passed | Treated as ordinary numbers. |
| 21 | Birth dates that do not exist (31.02., 30.02.) | handled with message | Rows skipped and listed as "birth date not recognised". |
| 22 | A missing birth date, a missing score and a missing name | handled with message | Rows skipped, each with its reason (date, score, name). |
| 23 | A birth date in the future | handled with message | Row skipped as an unrecognised date. |
| 24 | Assessment date set earlier than some birth dates | fixed | Flagged: check the assessment date and the birth dates (before: negative ages were analysed silently). |
| 25 | A much older and a much younger child among twelve of the same year | fixed | Both children are flagged as outside the age group (before: they silently distorted the trend). |
| 26 | Dates with a two-digit year (14.02.14) | handled with message | Row skipped; the century is not guessed. |
| 27 | 1 September cut-off with birthdays on 31.08 and 01.09 | passed | 31 August is the youngest quarter, 1 September the oldest. |
| 28 | 1 April cut-off with birthdays on 31.03 and 01.04 | passed | 31 March is the youngest quarter, 1 April the oldest. |
| 29 | 1 January cut-off with birthdays on 31.12 and 01.01 | passed | 31 December is the youngest quarter, 1 January the oldest. |
| 30 | Semicolon-separated, dd.mm.yyyy dates, decimal commas | passed | Parsed like the standard format. |
| 31 | Excel export with a byte-order mark and Windows line endings | passed | Parsed like the standard format. |
| 32 | Extra columns (club, position, notes) around the three needed ones | passed | Extra columns are ignored. |
| 33 | Blank lines and whitespace-only lines between rows | passed | Blank lines are ignored. |
| 34 | Names with č ć đ š ž and a quoted 'Surname, Name' | passed | Names are kept exactly. |
| 35 | Column names in Bosnian (ime; datum_rođenja; ocjena) | fixed | Bosnian column names are now accepted (before: "missing columns" message). |
| 36 | Column names in capitals with spaces | passed | Recognised like the lower-case names. |
| 37 | No score column | handled with message | Message naming the missing column; nothing analysed. |
| 38 | An empty file | handled with message | Message listing the three required columns. |
| 39 | A header and no rows | handled with message | Loads with zero players; nothing to analyse or recommend. |
| 40 | Rows with fewer columns than the header | handled with message | Rows skipped and listed as "not enough columns". |
| 41 | Scores written as text, a formula, or scientific notation | handled with message | Rows skipped as "score is not a number"; nothing is guessed. |
| 42 | A name that looks like a spreadsheet formula | passed | Kept as text; neutralised in the exported CSV. |
| 43 | A 500-player file | handled with message | First 300 analysed, "only the first 300 rows were used" shown; a direct 500-child analysis runs in well under a second. |

Data warnings shown to the coach (`src/lib/warnings.ts`): born after the test date, more
than two years older or younger than the rest, a score far from all the others, a tie at
the last place, and no age advantage in the squad.

## Architecture: math decides, AI explains

```
Browser (GitHub Pages, static)                Cloudflare Worker (/worker)          Anthropic
┌───────────────────────────────┐   click    ┌──────────────────────────────┐    ┌────────────┐
│ CSV → analysis → recommendation│ ─────────▶ │ CORS allow-list, strict      │ ─▶ │ Messages   │
│ (src/lib/squad.ts, all local)  │  numbers   │ schema, 60/hour per IP,      │    │ API        │
│ "Objasni mi (AI)" (optional)   │ ◀───────── │ no logging, key as a secret  │ ◀─ │            │
└───────────────────────────────┘    text    └──────────────────────────────┘    └────────────┘
```

- **The deterministic math is the only decision-maker.** Rankings, the second-look list,
  borderline children and reliability all come from `src/lib/squad.ts` and are unit
  tested. The AI never sees the squad file and cannot change a recommendation.
- **The AI layer is optional and only explains.** Nothing is sent until the coach clicks
  "Objasni mi (AI)" on the recommendation card or a player card.
- **What is sent** (`src/lib/explain.ts`, schema in `worker/src/schema.ts`): the child's
  age in months, raw and adjusted score and rank, squad size, the age trend and its 95%
  interval, cut-off month, test direction, late-born / borderline / second-look flags and
  the language. Numbers, booleans and three fixed codes; never names, never birth dates.
  Tests assert this for every child in the sample.
- **The Worker** (`worker/src/index.ts`) accepts requests only from the deployed site,
  rejects anything that is not exactly the schema (unknown fields, text where a number
  belongs), limits each IP to 60 requests an hour (a hashed counter in KV that expires
  after an hour), logs nothing, and calls the Anthropic Messages API with model
  `claude-opus-5-5` and `max_tokens: 400`. The API key is a Worker secret and is never
  in this repository.
- **The system prompt** (`worker/src/prompt.ts`): 3–4 short sentences in Bosnian or
  English, only the numbers given, never invent, never say a child is bad or should be
  cut, frame it as "take a second look", state uncertainty when the interval is wide or
  the child is borderline.
- **Failure is safe.** Loading state, 10-second timeout, and on any error, rate limit or
  refusal the app shows its own deterministic explanation, labelled as not AI. AI text is
  always marked "AI-generated".
- **Switched on:** `EXPLAIN_ENDPOINT` in `src/config.ts` points at the deployed Worker and
  its origin is the only extra entry in `connect-src` in `index.html`. Set the endpoint
  to an empty string to switch the AI layer off; the button then shows the deterministic
  explanation and no request is made.

### Deploying the Worker

```bash
cd worker
npm install
npx wrangler login                              # opens the browser
npx wrangler kv namespace create RATE_LIMIT     # paste the printed id into wrangler.toml
npx wrangler secret put ANTHROPIC_API_KEY       # paste the key at the prompt, nowhere else
npx wrangler deploy                             # prints the workers.dev URL
```

Set a monthly spend limit for that key in the Anthropic Console: the Origin check stops
other websites, but a script can forge that header, so the rate limit and the spend limit
are what bound the cost.

## Production readiness

The app is scanned with ProdReady ("check my app"). Findings with a real fix were fixed:
coverage floor, end-to-end journey, post-deploy smoke check, dependency audit and type
check in CI, a Privacy page, per-language string files, no console logging, and no
exports that exist only for tests.

Some rules assume a server, a database or a team. They do not apply here, and nothing
fake was added to satisfy them:

| Rule | Why it does not apply |
|---|---|
| Audit / activity log table | The site has no database. The optional Worker stores no request content and deliberately keeps no log of what coaches ask about children; its only state is an anonymous hourly counter. |
| Scheduled job that deletes expired data | Squad data lives in the tab's memory and is gone when the tab closes. The Worker's rate-limit counters expire on their own after one hour (KV `expirationTtl`), so no job is needed. |
| Second reader / code review in the history | Solo hackathon project with one author. `CONTRIBUTING.md` asks for pull requests from here on; no reviews were invented. |
| Data-protection contact address | No personal data is collected, so there is no controller mailbox. The Privacy page gives a contact route (project issues). |
| Auth, roles, rate limits, migrations, tenant isolation | No accounts, no API, no stored data. |

See also [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Code: [MIT](LICENSE) © 2026 Anes Berbić. The Transfermarkt-derived data comes from the
[transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets) project and
keeps its own terms.
