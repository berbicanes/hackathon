#!/usr/bin/env python3
"""Writes the edge-case squad fixtures to tests/fixtures/edge-cases/.

Each fixture is one JSON file: a CSV exactly as a coach might upload it, the settings to
analyse it with, a one-line description, the expected behaviour in words, and the checks
the test suite asserts. All children and scores are invented.

Usage: python3 scripts/make_edge_cases.py
"""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "edge-cases"
REF = "2026-09-01"
NAMES = ["Amar", "Lejla", "Tarik", "Emina", "Haris", "Sara", "Dino", "Ajla", "Kenan", "Nejra", "Edin", "Lana",
         "Mirza", "Hana", "Vedad", "Asja", "Adnan", "Iman", "Benjamin", "Ena"]
NOISE = [3, -2, 1, -4, 2, 0, -1, 4, -3, 1, 2, -2, 0, 3, -1, -3, 1, 2, -2, 0]
HEADER = "name,birth_date,score"


def kids(n, per_month=2.0, base=60.0, noise_scale=1.0, year=2014):
    """n children spread over the year; older children score per_month more per month of age."""
    rows = []
    for i in range(n):
        month = (i * 12) // n + 1
        day = 5 + (i * 7) % 20
        months_older_than_december = 12 - month
        score = base + per_month * months_older_than_december + NOISE[i % len(NOISE)] * noise_scale
        rows.append((NAMES[i % len(NAMES)] + (str(i // len(NAMES)) if i >= len(NAMES) else ""), f"{year}-{month:02d}-{day:02d}", round(score, 2)))
    return rows


def csv(rows, header=HEADER, sep=",", newline="\n"):
    return newline.join([header] + [sep.join(str(c) for c in r) for r in rows]) + newline


CASES = []


def case(slug, description, expected, text, expect, **options):
    CASES.append({
        "id": f"{len(CASES) + 1:02d}-{slug}",
        "description": description,
        "expected": expected,
        "options": {"referenceDate": REF, "topN": 5, "higherIsBetter": True, "cutoffMonth": 1, **options},
        "expect": expect,
        "csv": text,
    })


# --- Squad shape -------------------------------------------------------------------------
case("same-month", "All 12 children born in the same month",
     "Almost no age spread: trend not reliable, no misleading recommendation",
     csv([(NAMES[i], f"2014-03-{2 + i * 2:02d}", 60 + NOISE[i] * 3) for i in range(12)]),
     {"players": 12, "reliable": False})
case("same-day", "All 10 children born on the same day",
     "No age spread at all: no interval, nobody added",
     csv([(NAMES[i], "2014-05-05", 60 + i) for i in range(10)]),
     {"players": 10, "reliable": False, "secondLook": 0})
case("one-child", "A squad of one child",
     "Loads without error; too few to compare, nobody added",
     csv(kids(1)), {"players": 1, "reliable": False, "secondLook": 0}, topN=1)
for n in range(2, 10):
    case(f"n-{n}", f"A small squad of {n} children with a clear age trend",
         "Analysed, but marked as a rough guide only (fewer than 10 children)",
         csv(kids(n)), {"players": n, "reliable": False}, topN=max(1, n // 2))
case("identical-scores", "12 children, every score identical",
     "No trend, tie at the last place is flagged, nobody added",
     csv([(r[0], r[1], 70) for r in kids(12)]),
     {"players": 12, "reliable": False, "secondLook": 0, "warnings": ["tieAtLastPlace"]})
case("extreme-outlier", "One score is an obvious typing error (9999)",
     "The outlier is flagged so the coach can correct it",
     csv([(r[0], r[1], 9999 if i == 7 else r[2]) for i, r in enumerate(kids(14))]),
     {"players": 14, "warningsInclude": ["scoreOutlier"]})
case("negative-slope", "Younger children score higher (negative age trend)",
     "No age disadvantage to correct: nobody is added, and the coach is told why",
     csv(kids(16, per_month=-2.0, noise_scale=0.5)),
     {"players": 16, "secondLook": 0, "warningsInclude": ["noAgeAdvantage"]})
case("sprint-lower-is-better", "Sprint times in seconds, lower is better, older children faster",
     "Fastest child ranks first; adjustment works in the right direction",
     csv([(r[0], r[1], round(10.5 - (r[2] - 60) * 0.03, 2)) for r in kids(16, noise_scale=0.5)]),
     {"players": 16, "reliable": True, "rawFirstIsLowestScore": True, "warningsExclude": ["noAgeAdvantage"]}, higherIsBetter=False)
case("sprint-wrong-direction", "Sprint times loaded with the default 'higher is better' setting",
     "Older children appear to score worse: the app says so and points to the direction setting",
     csv([(r[0], r[1], round(10.5 - (r[2] - 60) * 0.03, 2)) for r in kids(16, noise_scale=0.5)]),
     {"players": 16, "secondLook": 0, "warningsInclude": ["noAgeAdvantage"]})
tie = kids(12, noise_scale=0)
tie = [(n, d, 70 if i in (4, 5) else s) for i, (n, d, s) in enumerate(tie)]
case("tie-at-last-place", "Two children share the score at the last selected place",
     "The tie is flagged; the order between them is not presented as a judgement",
     csv(tie), {"players": 12, "warningsInclude": ["tieAtLastPlace"]})
tie3 = [(n, d, 70 if i in (4, 5, 6) else s) for i, (n, d, s) in enumerate(kids(12, noise_scale=0))]
case("three-way-tie", "Three children share the score at the last selected place",
     "The tie is flagged with the number of children involved",
     csv(tie3), {"players": 12, "warningsInclude": ["tieAtLastPlace"]})
case("top-n-above-squad", "More places than children",
     "Everyone is kept; nobody to add",
     csv(kids(12)), {"players": 12, "keep": 12, "secondLook": 0}, topN=50)
case("negative-and-zero-scores", "Scores include zero and negative numbers",
     "Treated as ordinary numbers",
     csv([(r[0], r[1], r[2] - 75) for r in kids(12)]), {"players": 12, "reliable": True})

# --- Dates -------------------------------------------------------------------------------
base = kids(10)
case("impossible-dates", "Birth dates that do not exist (31.02., 30.02.)",
     "Those rows are skipped and listed; the rest is analysed",
     csv(base + [("Zlatan", "31.02.2014", 70), ("Minela", "2014-02-30", 65)]),
     {"players": 10, "issues": ["date", "date"]})
case("missing-values", "A missing birth date, a missing score and a missing name",
     "Each row is skipped with its own reason",
     csv(base + [("Zlatan", "", 70), ("Minela", "2014-04-04", ""), ("", "2014-05-05", 66)]),
     {"players": 10, "issues": ["date", "score", "name"]})
case("future-birth-date", "A birth date in the future",
     "The row is skipped as an unrecognised date",
     csv(base + [("Zlatan", "2031-01-01", 70)]), {"players": 10, "issues": ["date"]})
case("born-after-test-date", "Assessment date set earlier than some birth dates",
     "Flagged: check the test date and the birth dates",
     csv(kids(12)), {"players": 12, "warningsInclude": ["bornAfterTest"]}, referenceDate="2014-06-01")
case("outside-age-group", "A much older and a much younger child among twelve of the same year",
     "Both are flagged as outside the age group",
     csv(kids(12) + [("Zlatan", "2008-03-03", 95), ("Minela", "2019-10-10", 30)]),
     {"players": 14, "warningsInclude": ["ageOutlier"]})
case("two-digit-year", "Dates with a two-digit year (14.02.14)",
     "Not guessed: the rows are skipped as unrecognised dates",
     csv(base + [("Zlatan", "14.02.14", 70)]), {"players": 10, "issues": ["date"]})

# --- Cut-off boundaries ------------------------------------------------------------------
case("september-boundary", "1 September cut-off with birthdays on 31.08 and 01.09",
     "31 August is the youngest quarter, 1 September the oldest",
     csv(kids(10) + [("Granica31", "2013-08-31", 70), ("Granica01", "2013-09-01", 70)]),
     {"players": 12, "quarters": {"Granica31": 4, "Granica01": 1}}, cutoffMonth=9)
case("april-boundary", "1 April cut-off with birthdays on 31.03 and 01.04",
     "31 March is the youngest quarter, 1 April the oldest",
     csv(kids(10) + [("Granica31", "2014-03-31", 70), ("Granica01", "2014-04-01", 70)]),
     {"players": 12, "quarters": {"Granica31": 4, "Granica01": 1}}, cutoffMonth=4)
case("january-boundary", "1 January cut-off with birthdays on 31.12 and 01.01",
     "31 December is the youngest quarter, 1 January the oldest",
     csv(kids(10) + [("Granica31", "2014-12-31", 70), ("Granica01", "2014-01-01", 70)]),
     {"players": 12, "quarters": {"Granica31": 4, "Granica01": 1}})

# --- File format -------------------------------------------------------------------------
euro = [(n, f"{d[8:10]}.{d[5:7]}.{d[0:4]}", str(s).replace(".", ",")) for n, d, s in kids(12, noise_scale=1.5)]
case("semicolon-european", "Semicolon-separated, dd.mm.yyyy dates, decimal commas",
     "Parsed like the standard format",
     csv(euro, header="name;birth_date;score", sep=";"), {"players": 12, "issues": []})
case("bom-and-crlf", "Excel export with a byte-order mark and Windows line endings",
     "Parsed like the standard format",
     "﻿" + csv(euro, header="Name;Birth Date;Score", sep=";", newline="\r\n"), {"players": 12, "issues": []})
case("extra-columns", "Extra columns (club, position, notes) around the three needed ones",
     "Extra columns are ignored",
     csv([("FK Primjer", n, "napad", d, s, "ok") for n, d, s in kids(12)], header="club,name,position,birth_date,score,notes"),
     {"players": 12, "issues": []})
case("empty-rows", "Blank lines and whitespace-only lines between rows",
     "Blank lines are ignored",
     "\n\n" + HEADER + "\n" + "\n   \n".join(",".join(str(c) for c in r) for r in kids(12)) + "\n\n\n",
     {"players": 12, "issues": []})
special = ["Čedomir Šehić", "Đana Žigić", "Ćamil Hadžić", "Šejla Đozo", "Željko Čolić"]
case("diacritics-and-quotes", "Names with č ć đ š ž and a quoted 'Surname, Name'",
     "Names are kept exactly",
     csv([(special[i] if i < 5 else f'"Hodžić, {n}"' if i == 5 else n, d, s) for i, (n, d, s) in enumerate(kids(12))]),
     {"players": 12, "names": special + ["Hodžić, Sara"]})
case("bosnian-headers", "Column names in Bosnian (ime; datum_rođenja; ocjena)",
     "Recognised (fixed: English and Bosnian column names are both accepted)",
     csv(euro, header="Ime;Datum rođenja;Ocjena", sep=";"), {"players": 12, "issues": []})
case("uppercase-headers", "Column names in capitals with spaces",
     "Recognised like the lower-case names",
     csv(kids(12), header="NAME,BIRTH DATE,SCORE"), {"players": 12, "issues": []})
case("missing-column", "No score column",
     "Clear message naming the missing column; nothing is analysed",
     csv([(n, d) for n, d, _ in kids(12)], header="name,birth_date"), {"players": 0, "missingColumns": ["score"]})
case("empty-file", "An empty file",
     "Clear message; nothing is analysed", "", {"players": 0, "missingColumns": ["name", "birth_date", "score"]})
case("header-only", "A header and no rows",
     "Loads with zero players; nothing to analyse", HEADER + "\n", {"players": 0})
case("short-rows", "Rows with fewer columns than the header",
     "Those rows are skipped and listed",
     csv(base) + "Zlatan,2014-03-03\nMinela\n", {"players": 10, "issues": ["columns", "columns"]})
case("score-not-a-number", "Scores written as text, a formula, or scientific notation",
     "Those rows are skipped: nothing is guessed",
     csv(base + [("Zlatan", "2014-03-03", "dobar"), ("Minela", "2014-04-04", "=1+1"), ("Faris", "2014-05-05", "1e9")]),
     {"players": 10, "issues": ["score", "score", "score"]})
case("formula-in-name", "A name that looks like a spreadsheet formula",
     "Kept as text; neutralised in the exported CSV",
     csv(base + [("=HYPERLINK(\"http://x\")", "2014-03-03", 70)]), {"players": 11, "formulaSafe": True})

# --- Size --------------------------------------------------------------------------------
case("five-hundred-players", "A 500-player file",
     "The first 300 are analysed and the coach is told the rest was left out; stays fast",
     csv(kids(500, noise_scale=2.0)), {"players": 300, "truncated": True, "fastMs": 1500}, topN=30)

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.json"):
    old.unlink()
for c in CASES:
    (OUT / f"{c['id']}.json").write_text(json.dumps(c, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"Wrote {len(CASES)} fixtures to {OUT}")
