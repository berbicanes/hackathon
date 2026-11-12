export type Lang = 'en'

const en = {
  appName: 'Late Bloomers',
  tagline: 'See the hidden talent your selection is missing.',
  tabBias: 'Bias mirror',
  tabSquad: 'Your squad',
  privacy: 'Your squad data never leaves this device. No uploads, no accounts, no tracking.',
  footerData: 'Professional data: Transfermarkt via the open transfermarkt-datasets project.',

  // Bias mirror
  biasKicker: 'The evidence · {n} professional players',
  biasHeadline: 'of active under-21 professionals were born January–March.',
  biasSub: (expected: string, q4: string, ratio: string) =>
    `By days in the calendar you would expect ${expected}. Only ${q4} were born October–December — a January-to-March child is ${ratio}× as likely to make it as an October-to-December child.`,
  chartTitle: 'Share of players by birth quarter',
  expectedLine: 'Expected 25% (share of days in the quarter)',
  expectedMonth: 'Expected (share of days in the month)',
  groupU21: 'Under 21 (active)',
  groupAll: 'All players',
  groupLabel: 'Group',
  quarterLabels: ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'],
  quarterShort: ['Q1', 'Q2', 'Q3', 'Q4'],
  earlyBorn: 'early-born',
  lateBorn: 'late-born',
  monthTitle: 'By birth month (observed vs expected)',
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  statSample: 'Sample size',
  statChi: 'Chi-square (df 3)',
  statP: 'p-value',
  statRatio: 'Q1 : Q4 likelihood',
  underdogTitle: 'Do late-born players who survive turn out better?',
  underdogIntro:
    'The "underdog" check compares current market value of Q1- and Q4-born active players within the same age band, so older players never inflate one side.',
  underdogBand: 'Age band',
  underdogMedianQ1: 'Median value Q1',
  underdogMedianQ4: 'Median value Q4',
  underdogProb: 'Chance a Q4 player is worth more',
  underdogP: 'p-value',
  underdogVerdictYes: 'Q4 higher',
  underdogVerdictNo: 'No clear difference',
  underdogSummary:
    'Honest reading: at 18–21 there is no difference. From 22 onward, the late-born players who made it are worth slightly more — consistent with the idea that they had to be better to survive selection. The effect is small; it is a clue, not proof.',
  methodTitle: 'Method',
  method: [
    'Birth dates of all players in the public Transfermarkt dataset (snapshot July 2026); ages on 1 July 2026.',
    '"Active" means listed in a squad in the 2024 season or later. Quarters follow the 1 January cut-off used in UEFA youth football.',
    'Expected shares are weighted by days per month (February = 28.25 days). Chi-square goodness-of-fit test against that expectation.',
    'Market values compared within age bands with a Mann-Whitney U test (never pooled across ages).',
  ],
  limitsTitle: 'Limitations',
  limits: [
    'Births are not perfectly uniform across the year; national seasonal patterns differ slightly from the day-weighted expectation.',
    'Transfermarkt covers professional leagues, mostly in Europe, and players with a profile — not every footballer.',
    'Countries with different selection cut-offs are mixed in, which if anything makes the effect look smaller.',
    'Market value is an imperfect proxy for ability.',
  ],
  loading: 'Loading analysis…',
  loadError: 'Could not load the analysis data. Please reload the page.',

  // Your squad
  squadTitle: 'Your squad, seen fairly',
  squadIntro:
    'Upload your squad’s assessment scores. Late Bloomers separates what is ability from what is simply being older, so you can take a second look before you cut a child.',
  upload: 'Upload squad CSV',
  loadSample: 'Load synthetic sample',
  downloadTemplate: 'Download CSV template',
  csvHelp: 'Columns: name, birth_date (2014-03-21 or 21.03.2014), score (any test or rating where higher is better).',
  syntheticBanner:
    'SYNTHETIC SAMPLE — invented children and scores, for demonstration only. Upload your own CSV to analyse a real squad.',
  assessmentDate: 'Assessment date',
  fileTooLarge: 'That file is too large. Please keep it under 200 KB.',
  fileUnreadable: 'That file could not be read as text.',
  missingColumns: (cols: string) => `The CSV is missing these columns: ${cols}. Download the template to see the format.`,
  issues: (n: number) => `${n} row${n === 1 ? '' : 's'} skipped:`,
  issueReason: {
    columns: 'not enough columns',
    name: 'missing name',
    date: 'birth date not recognised',
    score: 'score is not a number',
  },
  issueLine: (line: number, reason: string) => `line ${line}: ${reason}`,
  truncated: (max: number) => `Only the first ${max} rows were used.`,
  tooFew: 'Add at least 4 players to compare selections.',
  smallSquad: 'With fewer than 10 players the age trend is rough — treat results as a prompt, not a verdict.',

  skewTitle: 'Your squad’s birth months',
  skewSummary: (early: number, n: number) => `${early} of ${n} players were born in the first half of the year.`,
  skewNote: 'In an unbiased intake you would expect about half.',
  countLabel: 'players',

  talentTitle: 'Hidden talents',
  talentIntro: 'These players rise most once age is taken into account.',
  talentNone: 'Nobody moves up much: in this squad, scores barely depend on age.',
  talentRank: (from: number, to: number) => `Rank ${from} → ${to}`,
  monthsYounger: (m: number) => `${m} month${m === 1 ? '' : 's'} younger than squad average`,
  monthsOlder: (m: number) => `${m} month${m === 1 ? '' : 's'} older than squad average`,

  selectionTitle: 'Selection: raw vs fair',
  selectionIntro: 'Choose how many players you select. Switch views to see exactly who changes.',
  topN: 'Players to select',
  viewRaw: 'Raw score',
  viewFair: 'Age-adjusted',
  changes: (k: number, n: number) =>
    k === 0 ? `The fair view selects the same ${n} players.` : `The fair view changes ${k} of ${n} places.`,
  badgeIn: 'In with fair view',
  badgeOut: 'Out with fair view',
  selected: 'Selected',
  notSelected: 'Not selected',
  colName: 'Name',
  colBorn: 'Born',
  colAge: 'Age',
  colRaw: 'Raw score',
  colFair: 'Fair score',
  colRank: 'Rank',
  colStatus: 'Status',
  ageYM: (y: number, m: number) => `${y}y ${m}m`,
  trend: (slope: string) => `In this squad, each extra month of age is worth about ${slope} points.`,
  trendNone: 'In this squad, older players do not score higher — the adjustment changes little.',
  downloadResults: 'Download results CSV',
  fairExplain:
    'Fair score = the player’s score compared with what is typical for their exact age in this squad (residual of a straight-line fit of score on age in months), put back on your original scale.',
}

export type Strings = typeof en
export const strings: Record<Lang, Strings> = { en }

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')
}
