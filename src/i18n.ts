import { formatNumber } from './lib/format'

export type Lang = 'bs' | 'en'

export const LANGS: Lang[] = ['bs', 'en']

/** Bosnian plural forms: 1 / 2–4 / 5+ (11–14 take the "many" form). */
export function bsPlural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

const enPlural = (n: number, word: string) => `${word}${n === 1 ? '' : 's'}`

const EN_SEP = { decimal: '.', group: ',' }
const BS_SEP = { decimal: ',', group: '.' }

export interface Strings {
  decimal: string
  num: (value: number, digits?: number) => string
  /** Share 0–1 as a percentage. */
  pct: (share: number, digits?: number) => string
  formatDate: (d: Date) => string
  monthsLong: string[]
  langName: string
  langSwitch: string
  skip: string
  navLabel: string
  appName: string
  tagline: string
  tabBias: string
  tabSquad: string
  privacy: string
  footerData: string

  biasKicker: (n: string) => string
  biasHeadline: string
  biasSub: (expected: string, q4: string, ratio: string) => string
  chartTitle: string
  expectedLine: string
  expectedMonth: string
  groupU21: string
  groupAll: string
  groupLabel: string
  quarterLabels: string[]
  quarterShort: string[]
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
  underdogSummary: string
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
  loadError: string
  ctaSquad: string
  ctaSquadText: string

  squadTitle: string
  squadIntro: string
  upload: string
  loadSample: string
  downloadTemplate: string
  csvHelp: string
  syntheticBanner: string
  assessmentDate: string
  fileTooLarge: string
  fileUnreadable: string
  missingColumns: (cols: string) => string
  issues: (n: number) => string
  issueReason: Record<'columns' | 'name' | 'date' | 'score', string>
  issueLine: (line: number, reason: string) => string
  truncated: (max: number) => string
  tooFew: string
  smallSquad: string

  skewTitle: string
  skewChart: string
  skewSummary: (early: number, n: number) => string
  skewNote: string

  talentTitle: string
  talentIntro: string
  talentNone: string
  talentRank: (from: number, to: number) => string
  monthsYounger: (m: number) => string
  monthsOlder: (m: number) => string
  averageAge: string

  selectionTitle: string
  selectionIntro: string
  topN: string
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
  mondayIntro: string
  monday: { title: string; text: string }[]

  printButton: string
  reportTitle: string
  reportMeta: (date: string, n: number) => string
  reportSkew: string
  reportSelection: (n: number) => string
  reportIn: string
  reportOut: string
  reportNone: string
  reportTalents: string
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

const en: Strings = {
  decimal: EN_SEP.decimal,
  num: (v, digits = 0) => formatNumber(v, digits, EN_SEP),
  pct: (share, digits = 0) => `${formatNumber(share * 100, digits, EN_SEP)}%`,
  formatDate: (d) => `${d.getUTCDate()} ${en.monthsLong[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
  monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  langName: 'English',
  langSwitch: 'Language',
  skip: 'Skip to content',
  navLabel: 'Sections',
  appName: 'Late Bloomers',
  tagline: 'See the hidden talent your selection is missing.',
  tabBias: 'Bias mirror',
  tabSquad: 'Your squad',
  privacy: 'Your squad data never leaves this device. No uploads, no accounts, no tracking.',
  footerData: 'Professional data: Transfermarkt via the open transfermarkt-datasets project.',

  biasKicker: (n) => `The evidence · ${n} professional players`,
  biasHeadline: 'of active under-21 professionals were born January–March.',
  biasSub: (expected, q4, ratio) =>
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
  cutoffTitle: 'Does the cut-off date change the picture?',
  cutoffIntro:
    'Not every country groups children by calendar year. England and Wales use 1 September and Japan 2 April (counted here from 1 April), so January–December quarters are the wrong ruler for them. We re-ran the under-21 test without those countries, and measured England and Japan against their own cut-off. “Oldest quarter” is the three months right after the cut-off, “youngest quarter” the three months before it. Country means citizenship in Transfermarkt.',
  cutoffColGroup: 'Group',
  cutoffColCutoff: 'Cut-off',
  cutoffColN: 'Players',
  cutoffColFirst: 'Oldest quarter',
  cutoffColLast: 'Youngest quarter',
  cutoffColRatio: 'Oldest : youngest',
  cutoffRows: {
    u21_all: 'Under 21, all countries',
    u21_excl_england: 'Under 21, without England',
    u21_excl_non_january: 'Under 21, without England, Wales and Japan',
    england_u21_jan: 'England under 21, wrong ruler',
    england_u21: 'England under 21, own cut-off',
    england_all: 'England, all players',
    japan_u21: 'Japan under 21, own cut-off',
    japan_all: 'Japan, all players',
  },
  cutoffDate: (month) => `1 ${en.months[month - 1]}`,
  cutoffNotSig: 'not significant',
  cutoffSummary: (a) =>
    `Honest reading: the headline holds. Without England the ratio moves from ${a.base}× to ${a.exclEngland}× (${a.exclAll}× without Wales and Japan too), so mixing cut-offs was hiding a little of the effect, not creating it. England’s under-21s, measured from 1 September, point the same way (${a.englandRatio}×), but with only ${a.englandN} players that is ${a.englandSignificant ? 'statistically significant' : 'not statistically significant on its own'} (p = ${a.englandP}). Across all English players in the data the skew is clear (${a.englandAllRatio}×).`,
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
    'The headline numbers use January–December quarters for everyone, although England, Wales and Japan use other cut-offs. Leaving them out changes the under-21 result only slightly (see the cut-off check). Countries are identified by citizenship, so that split is approximate, and other countries with unusual cut-offs may remain.',
    'England’s under-21 sample is small (175 players): on its own, measured from 1 September, its skew is not statistically significant.',
    'Market value is an imperfect proxy for ability.',
  ],
  loading: 'Loading analysis…',
  loadError: 'Could not load the analysis data. Please reload the page.',
  ctaSquad: 'Check your own squad',
  ctaSquadText: 'The same bias happens in every U10 trial. See it in your squad in two minutes — free and private.',

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
  missingColumns: (cols) => `The CSV is missing these columns: ${cols}. Download the template to see the format.`,
  issues: (n) => `${n} ${enPlural(n, 'row')} skipped:`,
  issueReason: {
    columns: 'not enough columns',
    name: 'missing name',
    date: 'birth date not recognised',
    score: 'score is not a number',
  },
  issueLine: (line, reason) => `line ${line}: ${reason}`,
  truncated: (max) => `Only the first ${max} rows were used.`,
  tooFew: 'Add at least 4 players to compare selections.',
  smallSquad: 'With fewer than 10 players the age trend is rough — treat results as a prompt, not a verdict.',

  skewTitle: 'Your squad’s birth months',
  skewChart: 'Players per birth quarter',
  skewSummary: (early, n) => `${early} of ${n} players were born in the first half of the year.`,
  skewNote: 'In an unbiased intake you would expect about half.',

  talentTitle: 'Hidden talents',
  talentIntro: 'These players rise most once age is taken into account. Tap a name for their player card.',
  talentNone: 'Nobody moves up much: in this squad, scores barely depend on age.',
  talentRank: (from, to) => `Rank ${from} → ${to}`,
  monthsYounger: (m) => `${m} ${enPlural(m, 'month')} younger than the squad average`,
  monthsOlder: (m) => `${m} ${enPlural(m, 'month')} older than the squad average`,
  averageAge: 'About the squad’s average age',

  selectionTitle: 'Selection: raw vs fair',
  selectionIntro: 'Choose how many players you select. Switch views to see exactly who changes.',
  topN: 'Players to select',
  viewRaw: 'Raw score',
  viewFair: 'Age-adjusted',
  changes: (k, n) =>
    k === 0 ? `The fair view selects the same ${n} players.` : `The fair view changes ${k} of ${n} places.`,
  badgeIn: 'In with fair view',
  badgeOut: 'Out with fair view',
  selected: 'Selected',
  notSelected: 'Not selected',
  colName: 'Name',
  colAge: 'Age',
  colRaw: 'Raw score',
  colFair: 'Fair score',
  colRank: 'Rank',
  colStatus: 'Status',
  ageYM: (y, m) => `${y}y ${m}m`,
  trend: (slope) => `In this squad, each extra month of age is worth about ${slope} points.`,
  trendNone: 'In this squad, older players do not score higher — the adjustment changes little.',
  downloadResults: 'Download results CSV',
  fairExplain:
    'Fair score = the player’s score compared with what is typical for their exact age in this squad (residual of a straight-line fit of score on age in months), put back on your original scale.',
  openCard: (name) => `Open player card for ${name}`,

  cardTitle: 'Player card',
  cardClose: 'Close',
  cardBorn: (date, quarter) => `Born ${date} (${quarter})`,
  cardTopForAge: (pct) => `Top ${pct}% of the squad for their age.`,
  cardDeveloping: 'Still developing compared with children of the same age.',
  cardRanks: (raw, fair, n) => `Rank on raw score: ${raw} of ${n}. Rank for their age: ${fair} of ${n}.`,
  cardAdviceTitle: 'Suggested next step',
  advice: {
    secondLook: {
      title: 'Take a second look',
      text: 'Part of the gap to older teammates is age, not ability. Keep in the group and reassess in 6 months.',
    },
    keep: {
      title: 'Keep',
      text: 'Strong for their age. Keep challenging them.',
    },
    checkAgeAdvantage: {
      title: 'Look past size and speed',
      text: 'Part of this score may come from being older. Check skills that do not depend on physical maturity, such as first touch and decisions.',
    },
    reassess: {
      title: 'Keep developing',
      text: 'Reassess in 6 months with the whole group, using age-fair measures.',
    },
  },
  cardFooter: 'This card is a prompt for a conversation, not a verdict on a child.',

  mondayTitle: 'What your club can do on Monday',
  mondayIntro: 'Three changes that cost nothing.',
  monday: [
    {
      title: 'Assess by age in months',
      text: 'Write each child’s age in months next to every test score, and compare children with others of the same age — not with the oldest in the group.',
    },
    {
      title: 'Reassess late-born players later',
      text: 'Before releasing a child born October–December, book a second look 6 months later. Late bloomers often catch up.',
    },
    {
      title: 'Rotate or band selection by birth quarter',
      text: 'Make sure every birth quarter gets starts and squad places, or run trials in half-year groups so January and December children are not compared directly.',
    },
  ],
  printButton: 'Print squad fairness report',
  reportTitle: 'Squad fairness report',
  reportMeta: (date, n) => `Assessment date ${date} · ${n} players`,
  reportSkew: 'Birth quarters in this squad',
  reportSelection: (n) => `Top ${n} selection: what changes when age is taken into account`,
  reportIn: 'Come in with the fair view',
  reportOut: 'Drop out with the fair view',
  reportNone: 'No changes.',
  reportTalents: 'Take a second look at',
  reportSynthetic: 'Synthetic sample data — not real children.',
  reportFooter: 'Made with Late Bloomers. Data was processed only on this device. A prompt for a conversation, not a verdict on any child.',
}

const bs: Strings = {
  decimal: BS_SEP.decimal,
  num: (v, digits = 0) => formatNumber(v, digits, BS_SEP),
  pct: (share, digits = 0) => `${formatNumber(share * 100, digits, BS_SEP)}%`,
  formatDate: (d) => `${d.getUTCDate()}. ${bs.monthsLong[d.getUTCMonth()]} ${d.getUTCFullYear()}.`,
  monthsLong: ['januar', 'februar', 'mart', 'april', 'maj', 'juni', 'juli', 'august', 'septembar', 'oktobar', 'novembar', 'decembar'],
  langName: 'Bosanski',
  langSwitch: 'Jezik',
  skip: 'Preskoči na sadržaj',
  navLabel: 'Sekcije',
  appName: 'Late Bloomers',
  tagline: 'Pronađite skriveni talenat koji vaša selekcija propušta.',
  tabBias: 'Ogledalo pristranosti',
  tabSquad: 'Vaša ekipa',
  privacy: 'Podaci o vašoj ekipi nikad ne napuštaju ovaj uređaj. Bez slanja, bez naloga, bez praćenja.',
  footerData: 'Profesionalni podaci: Transfermarkt, preko otvorenog projekta transfermarkt-datasets.',

  biasKicker: (n) => `Dokazi · ${n} profesionalnih igrača`,
  biasHeadline: 'aktivnih profesionalaca mlađih od 21 godine rođeno je u januaru, februaru ili martu.',
  biasSub: (expected, q4, ratio) =>
    `Prema broju dana u godini očekivali biste ${expected}. Samo ${q4} rođeno je od oktobra do decembra — dijete rođeno u januaru–martu ima ${ratio}× veće šanse da uspije od djeteta rođenog u oktobru–decembru.`,
  chartTitle: 'Udio igrača po kvartalu rođenja',
  expectedLine: 'Očekivano 25% (udio dana u kvartalu)',
  expectedMonth: 'Očekivano (udio dana u mjesecu)',
  groupU21: 'Mlađi od 21 (aktivni)',
  groupAll: 'Svi igrači',
  groupLabel: 'Grupa',
  quarterLabels: ['jan–mar', 'apr–jun', 'jul–sep', 'okt–dec'],
  quarterShort: ['K1', 'K2', 'K3', 'K4'],
  earlyBorn: 'rano rođeni',
  lateBorn: 'kasno rođeni',
  monthTitle: 'Po mjesecu rođenja (stvarno i očekivano)',
  months: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  statSample: 'Veličina uzorka',
  statChi: 'Hi-kvadrat (df 3)',
  statP: 'p-vrijednost',
  statRatio: 'Šansa K1 : K4',
  underdogTitle: 'Jesu li kasno rođeni koji opstanu na kraju bolji?',
  underdogIntro:
    'Provjera „autsajdera“ poredi trenutnu tržišnu vrijednost aktivnih igrača rođenih u K1 i K4 unutar iste starosne grupe, tako da stariji igrači nikad ne naduvaju jednu stranu.',
  underdogBand: 'Starosna grupa',
  underdogMedianQ1: 'Medijan vrijednosti K1',
  underdogMedianQ4: 'Medijan vrijednosti K4',
  underdogProb: 'Šansa da igrač iz K4 vrijedi više',
  underdogP: 'p-vrijednost',
  underdogVerdictYes: 'K4 viši',
  underdogVerdictNo: 'Nema jasne razlike',
  underdogSummary:
    'Iskreno tumačenje: sa 18–21 godina nema razlike. Od 22. godine kasno rođeni koji su uspjeli vrijede malo više — što se slaže s idejom da su morali biti bolji da prežive selekciju. Efekat je mali; to je trag, ne dokaz.',
  cutoffTitle: 'Mijenja li datum granice sliku?',
  cutoffIntro:
    'Ne grupišu sve zemlje djecu po kalendarskoj godini. Engleska i Vels koriste 1. septembar, a Japan 2. april (ovdje računato od 1. aprila), pa su kvartali januar–decembar za njih pogrešno mjerilo. Ponovili smo test za mlađe od 21 bez tih zemalja, a Englesku i Japan izmjerili prema njihovoj vlastitoj granici. „Najstariji kvartal“ su tri mjeseca odmah nakon granice, a „najmlađi kvartal“ tri mjeseca prije nje. Zemlja znači državljanstvo na Transfermarktu.',
  cutoffColGroup: 'Grupa',
  cutoffColCutoff: 'Granica',
  cutoffColN: 'Igrača',
  cutoffColFirst: 'Najstariji kvartal',
  cutoffColLast: 'Najmlađi kvartal',
  cutoffColRatio: 'Najstariji : najmlađi',
  cutoffRows: {
    u21_all: 'Mlađi od 21, sve zemlje',
    u21_excl_england: 'Mlađi od 21, bez Engleske',
    u21_excl_non_january: 'Mlađi od 21, bez Engleske, Velsa i Japana',
    england_u21_jan: 'Engleska do 21, pogrešno mjerilo',
    england_u21: 'Engleska do 21, vlastita granica',
    england_all: 'Engleska, svi igrači',
    japan_u21: 'Japan do 21, vlastita granica',
    japan_all: 'Japan, svi igrači',
  },
  cutoffDate: (month) => `1. ${bs.months[month - 1]}`,
  cutoffNotSig: 'nije značajno',
  cutoffSummary: (a) =>
    `Iskreno tumačenje: glavni nalaz stoji. Bez Engleske omjer se pomjera sa ${a.base}× na ${a.exclEngland}× (${a.exclAll}× kad se izuzmu i Vels i Japan), dakle miješanje granica je malo skrivalo efekat, a nije ga stvaralo. Engleski igrači mlađi od 21, mjereni od 1. septembra, pokazuju isti smjer (${a.englandRatio}×), ali sa samo ${a.englandN} igrača to ${a.englandSignificant ? 'jeste statistički značajno' : 'samo po sebi nije statistički značajno'} (p = ${a.englandP}). Kod svih engleskih igrača u podacima pomak je jasan (${a.englandAllRatio}×).`,
  methodTitle: 'Metoda',
  method: [
    'Datumi rođenja svih igrača iz javnog Transfermarkt skupa podataka (stanje jul 2026); starost na dan 1. 7. 2026.',
    '„Aktivni“ znači da je igrač bio u nekoj ekipi u sezoni 2024. ili kasnije. Kvartali prate granicu od 1. januara koja se koristi u UEFA omladinskom fudbalu.',
    'Očekivani udjeli su ponderisani brojem dana u mjesecu (februar = 28,25 dana). Hi-kvadrat test slaganja s tim očekivanjem.',
    'Tržišne vrijednosti poređene unutar starosnih grupa Mann-Whitney U testom (nikad zbirno preko svih uzrasta).',
  ],
  limitsTitle: 'Ograničenja',
  limits: [
    'Rođenja nisu savršeno ravnomjerna tokom godine; sezonski obrasci u zemljama malo odstupaju od očekivanja po danima.',
    'Transfermarkt pokriva profesionalne lige, uglavnom u Evropi, i igrače s profilom — ne svakog fudbalera.',
    'Glavni brojevi koriste kvartale januar–decembar za sve, iako Engleska, Vels i Japan imaju drugačije granice. Kad se oni izuzmu, rezultat za mlađe od 21 mijenja se tek neznatno (vidi provjeru granice). Zemlje su određene po državljanstvu, pa je ta podjela približna, a moguće je da su ostale i druge zemlje s neuobičajenom granicom.',
    'Engleski uzorak mlađih od 21 je mali (175 igrača): sam za sebe, mjeren od 1. septembra, njegov pomak nije statistički značajan.',
    'Tržišna vrijednost je nesavršena mjera kvaliteta.',
  ],
  loading: 'Učitavam analizu…',
  loadError: 'Analiza se nije mogla učitati. Molimo osvježite stranicu.',
  ctaSquad: 'Provjerite svoju ekipu',
  ctaSquadText: 'Ista pristranost se dešava na svakom probnom treningu U10. Pogledajte je u svojoj ekipi za dvije minute — besplatno i privatno.',

  squadTitle: 'Vaša ekipa, pošteno gledano',
  squadIntro:
    'Učitajte ocjene sa testiranja svoje ekipe. Late Bloomers razdvaja ono što je sposobnost od onoga što je samo veća starost, kako biste još jednom pogledali prije nego što odbijete dijete.',
  upload: 'Učitaj CSV ekipe',
  loadSample: 'Učitaj sintetički primjer',
  downloadTemplate: 'Preuzmi CSV šablon',
  csvHelp: 'Kolone: name (ime), birth_date (2014-03-21 ili 21.03.2014), score (bilo koji test ili ocjena gdje je više bolje).',
  syntheticBanner:
    'SINTETIČKI PRIMJER — izmišljena djeca i ocjene, samo za demonstraciju. Učitajte svoj CSV da analizirate stvarnu ekipu.',
  assessmentDate: 'Datum testiranja',
  fileTooLarge: 'Datoteka je prevelika. Neka bude manja od 200 KB.',
  fileUnreadable: 'Datoteka se ne može pročitati kao tekst.',
  missingColumns: (cols) => `CSV nema ove kolone: ${cols}. Preuzmite šablon da vidite format.`,
  issues: (n) => `Preskočeno ${n} ${bsPlural(n, 'red', 'reda', 'redova')}:`,
  issueReason: {
    columns: 'premalo kolona',
    name: 'nedostaje ime',
    date: 'datum rođenja nije prepoznat',
    score: 'ocjena nije broj',
  },
  issueLine: (line, reason) => `red ${line}: ${reason}`,
  truncated: (max) => `Korišteno je samo prvih ${max} redova.`,
  tooFew: 'Dodajte bar 4 igrača da biste poredili selekcije.',
  smallSquad: 'S manje od 10 igrača trend po starosti je grub — rezultate shvatite kao podsticaj, ne kao presudu.',

  skewTitle: 'Mjeseci rođenja u vašoj ekipi',
  skewChart: 'Igrači po kvartalu rođenja',
  skewSummary: (early, n) =>
    `${early} od ${n} ${bsPlural(n, 'igrača', 'igrača', 'igrača')} rođeno je u prvoj polovini godine.`,
  skewNote: 'Bez pristranosti očekivali biste otprilike pola.',

  talentTitle: 'Skriveni talenti',
  talentIntro: 'Ovi igrači najviše napreduju kad se uzme u obzir starost. Dodirnite ime za karticu igrača.',
  talentNone: 'Niko ne napreduje mnogo: u ovoj ekipi ocjene gotovo ne zavise od starosti.',
  talentRank: (from, to) => `Mjesto ${from} → ${to}`,
  monthsYounger: (m) => `${m} ${bsPlural(m, 'mjesec', 'mjeseca', 'mjeseci')} ispod prosječne starosti ekipe`,
  monthsOlder: (m) => `${m} ${bsPlural(m, 'mjesec', 'mjeseca', 'mjeseci')} iznad prosječne starosti ekipe`,
  averageAge: 'Starost otprilike na prosjeku ekipe',

  selectionTitle: 'Selekcija: sirovo i pošteno',
  selectionIntro: 'Izaberite koliko igrača birate. Promijenite prikaz da vidite tačno ko se mijenja.',
  topN: 'Broj igrača za izbor',
  viewRaw: 'Sirova ocjena',
  viewFair: 'Prilagođeno starosti',
  changes: (k, n) =>
    k === 0
      ? `Pošteni prikaz bira istih ${n} igrača.`
      : `Pošteni prikaz mijenja ${k} od ${n} ${bsPlural(n, 'mjesta', 'mjesta', 'mjesta')}.`,
  badgeIn: 'Ulazi u poštenom prikazu',
  badgeOut: 'Izlazi u poštenom prikazu',
  selected: 'U izboru',
  notSelected: 'Nije u izboru',
  colName: 'Ime',
  colAge: 'Starost',
  colRaw: 'Sirova ocjena',
  colFair: 'Poštena ocjena',
  colRank: 'Mjesto',
  colStatus: 'Status',
  ageYM: (y, m) => `${y} g. ${m} mj.`,
  trend: (slope) => `U ovoj ekipi svaki mjesec starosti vrijedi otprilike ${slope} bodova.`,
  trendNone: 'U ovoj ekipi stariji igrači nemaju više ocjene — prilagođavanje malo mijenja.',
  downloadResults: 'Preuzmi rezultate (CSV)',
  fairExplain:
    'Poštena ocjena = ocjena igrača u poređenju s onim što je uobičajeno za tačno tu starost u ovoj ekipi (rezidual linearne regresije ocjene na starost u mjesecima), vraćena na vašu originalnu skalu.',
  openCard: (name) => `Otvori karticu igrača: ${name}`,

  cardTitle: 'Kartica igrača',
  cardClose: 'Zatvori',
  cardBorn: (date, quarter) => `Datum rođenja: ${date} (${quarter})`,
  cardTopForAge: (pct) => `Među najboljih ${pct}% u ekipi za svoju starost.`,
  cardDeveloping: 'Još se razvija u odnosu na djecu iste starosti.',
  cardRanks: (raw, fair, n) => `Mjesto po sirovoj ocjeni: ${raw} od ${n}. Mjesto za svoju starost: ${fair} od ${n}.`,
  cardAdviceTitle: 'Predloženi sljedeći korak',
  advice: {
    secondLook: {
      title: 'Pogledajte još jednom',
      text: 'Dio zaostatka za starijim saigračima je starost, a ne sposobnost. Zadržite u grupi i ponovo procijenite za 6 mjeseci.',
    },
    keep: {
      title: 'Zadržite',
      text: 'Odličan rezultat za svoju starost. Nastavite davati izazove.',
    },
    checkAgeAdvantage: {
      title: 'Gledajte dalje od visine i brzine',
      text: 'Dio ove ocjene može dolaziti od veće starosti. Provjerite vještine koje ne zavise od fizičke zrelosti, poput prvog dodira i odluka.',
    },
    reassess: {
      title: 'Nastavite razvoj',
      text: 'Ponovo procijenite za 6 mjeseci, s cijelom grupom, mjerama poštenim prema starosti.',
    },
  },
  cardFooter: 'Ova kartica je poziv na razgovor, a ne presuda o djetetu.',

  mondayTitle: 'Šta vaš klub može uraditi već u ponedjeljak',
  mondayIntro: 'Tri promjene koje ništa ne koštaju.',
  monday: [
    {
      title: 'Procjenjujte po starosti u mjesecima',
      text: 'Pored svake ocjene upišite starost djeteta u mjesecima i poredite ga s djecom iste starosti — ne s najstarijim u grupi.',
    },
    {
      title: 'Kasno rođene procijenite kasnije',
      text: 'Prije nego što odbijete dijete rođeno od oktobra do decembra, zakažite drugi pogled za 6 mjeseci. Kasni cvjetovi često sustignu ostale.',
    },
    {
      title: 'Rotirajte ili grupišite selekciju po kvartalu rođenja',
      text: 'Osigurajte da svaki kvartal rođenja dobije minute i mjesta u ekipi, ili organizujte probe u polugodišnjim grupama da se djeca iz januara i decembra ne porede direktno.',
    },
  ],
  printButton: 'Odštampaj izvještaj o pravednosti',
  reportTitle: 'Izvještaj o pravednosti selekcije',
  reportMeta: (date, n) => `Datum testiranja ${date} · ${n} ${bsPlural(n, 'igrač', 'igrača', 'igrača')}`,
  reportSkew: 'Kvartali rođenja u ovoj ekipi',
  reportSelection: (n) => `Izbor najboljih ${n}: šta se mijenja kad se uzme u obzir starost`,
  reportIn: 'Ulaze u poštenom prikazu',
  reportOut: 'Izlaze u poštenom prikazu',
  reportNone: 'Nema promjena.',
  reportTalents: 'Pogledajte još jednom',
  reportSynthetic: 'Sintetički primjer — nisu stvarna djeca.',
  reportFooter: 'Napravljeno pomoću Late Bloomers. Podaci su obrađeni samo na ovom uređaju. Poziv na razgovor, a ne presuda o djetetu.',
}

export const strings: Record<Lang, Strings> = { bs, en }
