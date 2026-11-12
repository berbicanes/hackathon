export type Lang = 'bs' | 'en'

export interface Strings {
  decimal: string
  num: (value: number, digits?: number) => string
  /** Share 0–1 as a percentage. */
  pct: (share: number, digits?: number) => string
  formatDate: (d: Date) => string
  monthsLong: string[]
  /** Language code sent with an explanation request. */
  lang: Lang
  langName: string
  aiButton: string
  aiNote: string
  aiLoading: string
  aiBadge: string
  aiDisclaimer: string
  aiFallbackBadge: string
  aiFallbackNote: string
  langSwitch: string
  skip: string
  navLabel: string
  stepWord: string
  stepNames: { problem: string; squad: string; decision: string }
  stepOf: (i: number, n: number) => string
  stepPrev: string
  stepNext: string
  squadNext: string
  decisionLead: string
  decisionEmpty: string
  decisionEmptyAction: string
  appName: string
  tagline: string
  privacy: string
  footerData: string
  privacyLink: string
  privacyTitle: string
  privacyLead: string
  privacySections: { title: string; text: string }[]
  privacyContactTitle: string
  privacyContactText: string
  privacyUpdated: string
  privacyBack: string

  biasKicker: (n: string) => string
  biasHeadline: string
  biasPlain: string
  problemTitle: string
  problemLead: string
  japanLine: (ratio: string) => string
  youthTitle: string
  youthSentence: (boysRatio: string, girlsRatio: string, girlsSignificant: boolean) => string
  youthBoys: string
  youthGirls: string
  youthStats: (n: string, ratio: string, p: string) => string
  youthBarLabel: (group: string, shares: string[]) => string
  youthSource: string
  biasSub: (expected: string, q4: string, ratio: string) => string
  chartTitle: string
  expectedLine: string
  expectedMonth: string
  groupU21: string
  groupAll: string
  groupLabel: string
  quarterLabels: string[]
  earlyBorn: string
  lateBorn: string
  monthTitle: string
  months: string[]
  statSample: string
  statChi: string
  statP: string
  statRatio: string
  underdogTitle: string
  underdogIntro: string
  underdogBand: string
  underdogMedianQ1: string
  underdogMedianQ4: string
  underdogProb: string
  underdogP: string
  underdogVerdictYes: string
  underdogVerdictNo: string
  underdogBonfCol: (threshold: string) => string
  underdogBonfYes: string
  underdogBonfNo: string
  underdogBonfNull: string
  underdogBonfNote: (tests: number, threshold: string) => string
  underdogSummary: string
  analystsTitle: string
  analystsHint: string
  cutoffTitle: string
  cutoffIntro: string
  cutoffColGroup: string
  cutoffColCutoff: string
  cutoffColN: string
  cutoffColFirst: string
  cutoffColLast: string
  cutoffColRatio: string
  cutoffRows: Record<CutoffRowId, string>
  cutoffDate: (month: number) => string
  cutoffNotSig: string
  cutoffSummary: (a: {
    base: string
    exclEngland: string
    exclAll: string
    englandRatio: string
    englandN: string
    englandP: string
    englandSignificant: boolean
    englandAllRatio: string
  }) => string
  methodTitle: string
  method: string[]
  limitsTitle: string
  limits: string[]
  loading: string
  errorTitle: string
  errorText: string
  errorReload: string
  loadError: string
  ctaSquad: string
  ctaSquadText: string

  squadIntro: string
  upload: string
  loadSample: string
  dropTitle: string
  orSample: string
  dateExplain: string
  directionLabel: string
  directionHigher: string
  directionLower: string
  lowerNote: string
  downloadTemplate: string
  csvHelp: string
  syntheticBanner: string
  syntheticShort: string
  assessmentDate: string
  dateInput: 'dmy' | 'native'
  dateHint: string
  dateInvalid: string
  fileTooLarge: string
  fileUnreadable: string
  fileNoRows: string
  loadedFile: (count: number, fileName: string) => string
  loadedSample: (count: number) => string
  missingColumns: (cols: string) => string
  issues: (n: number) => string
  issueReason: Record<'columns' | 'name' | 'date' | 'score', string>
  issueLine: (line: number, reason: string) => string
  truncated: (max: number) => string
  tooFew: string

  skewTitle: string
  skewChart: string
  /** `half` (e.g. "Sep–Feb") is given when the selection year does not start in January. */
  skewSummary: (early: number, n: number, half?: string) => string
  cutoffLabel: string
  cutoffOption: (month: number) => string
  cutoffHelp: string
  skewNote: string

  talentRank: (from: number, to: number) => string
  monthsYounger: (m: number) => string
  monthsOlder: (m: number) => string
  averageAge: string

  selectionTitle: string
  topN: string
  placesLess: string
  placesMore: string
  viewLabel: string
  viewExpanded: string
  recommendKicker: string
  /** `entrants` would be selected once age is taken into account; `borderline` are too close to call. */
  expandHeadline: (entrants: number, borderline: number) => string
  expandNone: string
  keepTitle: (n: number) => string
  keepText: string
  secondLookTitle: string
  secondLookBadge: string
  borderlineBadge: string
  borderlineWhy: string
  showAll: (n: number) => string
  compareNote: string
  inTitle: string
  outTitle: string
  reasonYounger: (range: string, max: number) => string
  reasonOlder: (range: string, max: number) => string
  rankingRaw: string
  rankingFair: string
  finishLine: string
  howTitle: string
  scatterHeading: string
  scatterTitle: string
  scatterSummary: (n: number, above: number, names: string) => string
  scatterX: string
  scatterY: string
  scatterYLower: string
  scatterLine: string
  scatterCaption: string
  viewRaw: string
  viewFair: string
  changes: (k: number, n: number) => string
  badgeIn: string
  badgeOut: string
  selected: string
  notSelected: string
  colName: string
  colAge: string
  colRaw: string
  colFair: string
  colRank: string
  colStatus: string
  ageYM: (y: number, m: number) => string
  trend: (slope: string) => string
  /** Estimate with its 95% interval; `plain` is true when both ends are positive. */
  trendCi: (slope: string, low: string, high: string, plain: boolean) => string
  unreliable: string
  warningsLabel: string
  warning: Record<import('../lib/warnings').WarningKind, (count: number) => string>
  testedOn: (cases: number) => string
  trendNone: string
  downloadResults: string
  fairExplain: string
  openCard: (name: string) => string

  cardTitle: string
  cardClose: string
  cardBorn: (date: string, quarter: string) => string
  cardTopForAge: (pct: number) => string
  cardDeveloping: string
  cardRanks: (raw: number, fair: number, n: number) => string
  cardAdviceTitle: string
  advice: Record<'secondLook' | 'keep' | 'checkAgeAdvantage' | 'reassess', { title: string; text: string }>
  cardFooter: string

  mondayTitle: string
  monday: { title: string; text: string }[]

  printButton: string
  reportTitle: string
  reportMeta: (date: string, n: number) => string
  reportSkew: string
  reportSelection: (n: number) => string
  reportNone: string
  reportSynthetic: string
  reportFooter: string
}

export type CutoffRowId =
  | 'u21_all'
  | 'u21_excl_england'
  | 'u21_excl_non_january'
  | 'england_u21_jan'
  | 'england_u21'
  | 'england_all'
  | 'japan_u21'
  | 'japan_all'
