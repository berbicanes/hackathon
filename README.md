# Late Bloomers

**Find the hidden talent your selection is missing.**

Live: https://berbicanes.github.io/hackathon/

In youth football, children are grouped by birth year. A child born in January can be
almost a full year older than a teammate born in December — taller, stronger, faster for
now. Coaches pick them, they get better coaching, and the late-born children are cut
before they have caught up. This is the **relative age effect (RAE)**.

Late Bloomers does two things:

1. **Bias mirror** — proves the effect on real data: 50,100 professional players from
   the public Transfermarkt dataset.
2. **Your squad** — a free tool for grassroots coaches. Upload your squad's assessment
   scores and see which children are being judged on age rather than ability, before you
   cut anyone.

For each child there is a plain-language **player card** ("6 months younger than the
squad average, top 32% for their age: take a second look, reassess in 6 months"), a
**"What your club can do on Monday"** panel with three no-cost actions, and a
**printable one-page squad fairness report**. The app is in **Bosnian** (default) and
**English**.

Everything runs in the browser. **Uploaded squad data never leaves the device**: no
backend, no database, no accounts, no analytics.

## Key findings

From `scripts/analyze.py` on the July 2026 snapshot (ages on 1 July 2026):

| | Result |
|---|---|
| Active under-21 professionals born Jan–Mar | **32.3%** (expected 24.7% by days), Oct–Dec only **18.4%** (n = 5,538, χ² = 234.9, p ≈ 1 × 10⁻⁵⁰) |
| Relative likelihood, Jan–Mar vs Oct–Dec born | **1.8×** |
| All 50,100 players | Q1 32.5% vs Q4 18.2%, χ² = 2,374, p < 10⁻³⁰⁰ |
| "Underdog" check, age 22–25 | Q4-born players are worth more: median €700k vs €600k (Mann-Whitney p = 0.0007) |
| "Underdog" check, age 26–29 | Small Q4 edge (p = 0.03) |
| "Underdog" check, age 18–21 | **No difference** (p = 0.96) |

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
- **Q1:Q4 likelihood ratio** = (observed / expected share for Q1) ÷ (same for Q4).
- **Underdog check**: current market value of Q1- vs Q4-born active players, compared
  **within** age bands 18–21, 22–25 and 26–29 (never pooled, so age never drives the
  comparison) with a two-sided Mann-Whitney U test. Null results are reported.
- The script uses only the Python standard library. The chi-square p-value comes from the
  regularised incomplete gamma function, checked against textbook critical values.

### Your squad (`src/lib/squad.ts`)

- **Age** in months at the assessment date.
- **Age-adjusted ("fair") score**: fit a straight line of score on age in months across
  the squad (ordinary least squares). A child's fair score is how far they sit above or
  below what is typical *for their exact age*, shifted back onto the original scale
  (residual + squad mean). If older children don't score higher, the adjustment changes
  almost nothing.
- **Selection**: top N by raw score vs top N by fair score; the app highlights exactly
  which children come in and which drop out.
- **Hidden talents**: the biggest rank gains once age is accounted for.
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
  footballers. Countries with other cut-off dates are mixed in, which, if anything,
  understates the effect.
- Market value is an imperfect proxy for ability; the underdog effect is small.
- The squad adjustment is a linear trend estimated from the squad itself. With fewer than
  about 10 players it is noisy, and the app says so. It is a prompt to take a second look,
  not a verdict on any child.

## Run locally

Requirements: Node 20+ and Python 3.10+.

```bash
npm ci
npm run dev        # http://localhost:5173/hackathon/
npm test           # unit tests (Vitest)
npm run lint
npm run build      # static site in dist/
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
- `score` is any assessment where higher is better; decimal commas are accepted.
- Files are limited to 200 KB and 300 players. Invalid rows are skipped and listed.

## Project layout

```
scripts/analyze.py        RAE analysis (standard library only)
public/data/rae.json      analysis output used by the Bias mirror
src/lib/                  pure logic + unit tests (squad, csv, playerCard, format)
src/components/           screens and UI pieces
src/i18n.ts               Bosnian and English strings
PITCH.md                  3-minute demo script and jury Q&A
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: lint → test → build → deploy to
GitHub Pages (Settings → Pages → Source: GitHub Actions). The site is fully static and is
served under `/hackathon/` (see `vite.config.ts`).

## Privacy and security

- No server, no cookies, no tracking. Squad files are read with the browser File API and
  analysed in memory.
- A strict Content-Security-Policy allows scripts only from the site itself.
- An error boundary shows a reload message instead of a blank page; errors stay in the
  browser console.
- Uploaded files are size- and row-limited and parsed defensively; exported CSV cells are
  protected against spreadsheet formula injection.
