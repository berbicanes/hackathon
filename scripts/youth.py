#!/usr/bin/env python3
"""Relative age effect in real youth football: the 2025 FIFA U-17 World Cups.

Reads the public Wikipedia squad lists and keeps ONLY birth dates. The players are
minors: no name is read into memory beyond the line being scanned, none is stored, and
the output contains aggregate counts only (per birth month), never a date or a player.

Usage:
    python3 scripts/youth.py                      # downloads the two pages
    python3 scripts/youth.py --boys a.wiki --girls b.wiki   # or use saved wikitext

Standard library only. Statistics are shared with scripts/analyze.py.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze import EXPECTED_QUARTER_SHARE, chi_square_gof, fmt_p  # noqa: E402

PAGES = {
    "boys": "2025_FIFA_U-17_World_Cup_squads",
    "girls": "2025_FIFA_U-17_Women%27s_World_Cup_squads",
}
RAW_URL = "https://en.wikipedia.org/w/index.php?title={page}&action=raw"
PAGE_URL = "https://en.wikipedia.org/wiki/{page}"
# {{birth date and age2|<as-of y>|<m>|<d>|<birth y>|<birth m>|<birth d>|...}}
BIRTH = re.compile(r"\{\{\s*birth date and age2\s*\|\s*\d{4}\s*\|\s*\d{1,2}\s*\|\s*\d{1,2}\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})", re.I)
# Both tournaments state eligibility from 1 January, i.e. a calendar-year cut-off.
CUTOFF = re.compile(r"born (?:on or after|between) 1 January", re.I)
ALPHA = 0.05


def fetch(page: str) -> str:
    request = urllib.request.Request(RAW_URL.format(page=page), headers={"User-Agent": "late-bloomers-research/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def birth_months(wikitext: str) -> list[int]:
    """Birth month (1-12) of every listed player. Names are never extracted."""
    months = []
    for year, month, day in BIRTH.findall(wikitext):
        try:
            months.append(date(int(year), int(month), int(day)).month)
        except ValueError:
            continue
    return months


def summarise(months: list[int], january_cutoff: bool) -> dict:
    by_month = [months.count(m) for m in range(1, 13)]
    quarters = [sum(by_month[q * 3:q * 3 + 3]) for q in range(4)]
    n = sum(quarters)
    share = [c / n for c in quarters]
    test = chi_square_gof(quarters, EXPECTED_QUARTER_SHARE)
    return {
        "n": n,
        "months": by_month,
        "quarters": quarters,
        "quarter_share": [round(s, 4) for s in share],
        "expected_quarter_share": [round(s, 4) for s in EXPECTED_QUARTER_SHARE],
        "q1_q4_ratio": round((share[0] / EXPECTED_QUARTER_SHARE[0]) / (share[3] / EXPECTED_QUARTER_SHARE[3]), 3),
        "chi2": test["chi2"],
        "p_value": test["p_value"],
        "significant_at_05": test["p_value"] < ALPHA,
        "january_cutoff": january_cutoff,
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--boys", type=Path, help="saved wikitext of the boys' squad page")
    parser.add_argument("--girls", type=Path, help="saved wikitext of the girls' squad page")
    parser.add_argument("--out", type=Path, default=Path("public/data/youth.json"))
    args = parser.parse_args(argv)

    result = {
        "title": "2025 FIFA U-17 World Cup and U-17 Women's World Cup squads",
        "privacy": "Aggregate counts only. No names and no individual birth dates are stored.",
        "definitions": {
            "quarters": "Q1 = Jan-Mar, Q4 = Oct-Dec (both tournaments use a 1 January eligibility cut-off)",
            "expected": "share of days in the period (Feb = 28.25 days)",
            "ratio": "(observed / expected share for Q1) / (same for Q4)",
        },
        "retrieved": date.today().isoformat(),
    }
    for group, page in PAGES.items():
        local = getattr(args, group)
        text = local.read_text(encoding="utf-8") if local else fetch(page)
        summary = summarise(birth_months(text), january_cutoff=bool(CUTOFF.search(text)))
        summary["source"] = PAGE_URL.format(page=page)
        result[group] = summary

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")
    for group in PAGES:
        s = result[group]
        print(f"{group}: n={s['n']}, Q1 {s['quarter_share'][0]:.1%}, Q4 {s['quarter_share'][3]:.1%}, "
              f"ratio {s['q1_q4_ratio']}, chi2 {s['chi2']}, p={fmt_p(s['p_value'])}, "
              f"significant: {s['significant_at_05']}, January cut-off stated: {s['january_cutoff']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
