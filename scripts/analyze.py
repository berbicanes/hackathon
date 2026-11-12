#!/usr/bin/env python3
"""Relative age effect (RAE) analysis on the public Transfermarkt dataset.

Usage:
    python3 scripts/analyze.py path/to/players.csv [--out public/data/rae.json]

Data: https://github.com/dcaribou/transfermarkt-datasets (players.csv.gz).
Standard library only, so the analysis runs anywhere Python 3.10+ is installed.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from datetime import date
from pathlib import Path

# Dataset is current to early July 2026; ages are computed on this date.
REFERENCE_DATE = date(2026, 7, 1)
# A player counts as "active" if listed in a squad in the last two seasons.
ACTIVE_FROM_SEASON = 2024
AGE_BANDS = [(18, 21), (22, 25), (26, 29)]
UNDER_AGE = 21

# Days per month in an average year (Feb = 28.25 to account for leap years).
DAYS_PER_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
YEAR_DAYS = sum(DAYS_PER_MONTH)
EXPECTED_MONTH_SHARE = [d / YEAR_DAYS for d in DAYS_PER_MONTH]
EXPECTED_QUARTER_SHARE = [sum(EXPECTED_MONTH_SHARE[q * 3:q * 3 + 3]) for q in range(4)]


# ---------------------------------------------------------------- statistics

def _gamma_series(a: float, x: float) -> float:
    """Regularized lower incomplete gamma P(a, x) by series expansion."""
    term = total = 1.0 / a
    n = a
    for _ in range(10_000):
        n += 1
        term *= x / n
        total += term
        if abs(term) < abs(total) * 1e-15:
            break
    return total * math.exp(-x + a * math.log(x) - math.lgamma(a))


def _gamma_cont_frac(a: float, x: float) -> float:
    """Regularized upper incomplete gamma Q(a, x) by continued fraction (Lentz)."""
    tiny = 1e-300
    b = x + 1 - a
    c = 1 / tiny
    d = 1 / b
    h = d
    for i in range(1, 10_000):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-15:
            break
    return h * math.exp(-x + a * math.log(x) - math.lgamma(a))


def chi2_sf(stat: float, df: int) -> float:
    """Survival function (p-value) of the chi-square distribution."""
    if stat <= 0:
        return 1.0
    a, x = df / 2, stat / 2
    if x < a + 1:
        return max(0.0, 1.0 - _gamma_series(a, x))
    return _gamma_cont_frac(a, x)


def chi_square_gof(observed: list[int], expected_share: list[float]) -> dict:
    n = sum(observed)
    expected = [n * s for s in expected_share]
    stat = sum((o - e) ** 2 / e for o, e in zip(observed, expected))
    df = len(observed) - 1
    return {"chi2": round(stat, 2), "df": df, "p_value": chi2_sf(stat, df)}


def mann_whitney(a: list[float], b: list[float]) -> dict:
    """Two-sided Mann-Whitney U test (normal approximation, tie-corrected)."""
    n1, n2 = len(a), len(b)
    combined = sorted([(v, 0) for v in a] + [(v, 1) for v in b])
    ranks = [0.0] * len(combined)
    tie_term = 0.0
    i = 0
    while i < len(combined):
        j = i
        while j + 1 < len(combined) and combined[j + 1][0] == combined[i][0]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[k] = avg
        t = j - i + 1
        tie_term += t ** 3 - t
        i = j + 1
    r1 = sum(r for r, (_, g) in zip(ranks, combined) if g == 0)
    u1 = r1 - n1 * (n1 + 1) / 2
    n = n1 + n2
    mu = n1 * n2 / 2
    sigma = math.sqrt(n1 * n2 / 12 * ((n + 1) - tie_term / (n * (n - 1))))
    z = (u1 - mu) / sigma if sigma else 0.0
    p = math.erfc(abs(z) / math.sqrt(2))
    # Probability that a random value from `a` exceeds one from `b` (ties = 1/2).
    prob_superiority = u1 / (n1 * n2)
    return {"z": round(z, 3), "p_value": p, "prob_a_greater": round(prob_superiority, 4)}


def median(values: list[float]) -> float:
    s = sorted(values)
    m = len(s) // 2
    return s[m] if len(s) % 2 else (s[m - 1] + s[m]) / 2


# ---------------------------------------------------------------- data

def parse_date(raw: str) -> date | None:
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def age_on(born: date, ref: date) -> int:
    return ref.year - born.year - ((ref.month, ref.day) < (born.month, born.day))


def load_players(path: Path) -> list[dict]:
    players = []
    with path.open(newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            born = parse_date(row.get("date_of_birth") or "")
            if born is None or born > REFERENCE_DATE:
                continue
            try:
                last_season = int(row.get("last_season") or 0)
            except ValueError:
                last_season = 0
            try:
                value = float(row.get("market_value_in_eur") or 0)
            except ValueError:
                value = 0.0
            players.append({
                "born": born,
                "age": age_on(born, REFERENCE_DATE),
                "active": last_season >= ACTIVE_FROM_SEASON,
                "value": value,
            })
    return players


def quarter(d: date) -> int:
    return (d.month - 1) // 3


def distribution(players: list[dict]) -> dict:
    months = [0] * 12
    for p in players:
        months[p["born"].month - 1] += 1
    quarters = [sum(months[q * 3:q * 3 + 3]) for q in range(4)]
    n = sum(months)
    q_share = [c / n for c in quarters]
    # Relative representation vs expectation; Q1:Q4 ratio of those.
    rel = [s / e for s, e in zip(q_share, EXPECTED_QUARTER_SHARE)]
    return {
        "n": n,
        "quarters": quarters,
        "quarter_share": [round(s, 4) for s in q_share],
        "expected_quarter_share": [round(s, 4) for s in EXPECTED_QUARTER_SHARE],
        "months": months,
        "month_share": [round(c / n, 4) for c in months],
        "expected_month_share": [round(s, 4) for s in EXPECTED_MONTH_SHARE],
        "q1_q4_ratio": round(rel[0] / rel[3], 3),
        "chi_square_quarters": chi_square_gof(quarters, EXPECTED_QUARTER_SHARE),
        "chi_square_months": chi_square_gof(months, EXPECTED_MONTH_SHARE),
    }


def underdog(players: list[dict]) -> list[dict]:
    rows = []
    for lo, hi in AGE_BANDS:
        band = [p for p in players if p["active"] and p["value"] > 0 and lo <= p["age"] <= hi]
        q1 = [p["value"] for p in band if quarter(p["born"]) == 0]
        q4 = [p["value"] for p in band if quarter(p["born"]) == 3]
        test = mann_whitney(q4, q1)
        rows.append({
            "band": f"{lo}-{hi}",
            "n_q1": len(q1),
            "n_q4": len(q4),
            "median_value_q1": median(q1),
            "median_value_q4": median(q4),
            "mean_value_q1": round(sum(q1) / len(q1)),
            "mean_value_q4": round(sum(q4) / len(q4)),
            "p_value": test["p_value"],
            "prob_q4_greater": test["prob_a_greater"],
            "significant_at_05": test["p_value"] < 0.05,
        })
    return rows


def fmt_p(p: float) -> str:
    return "< 1e-300" if p == 0 else f"{p:.2e}"


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("players_csv", type=Path)
    parser.add_argument("--out", type=Path, default=Path("public/data/rae.json"))
    args = parser.parse_args(argv)

    players = load_players(args.players_csv)
    active = [p for p in players if p["active"]]
    young = [p for p in active if p["age"] < UNDER_AGE]

    result = {
        "source": "Transfermarkt via github.com/dcaribou/transfermarkt-datasets (players.csv)",
        "reference_date": REFERENCE_DATE.isoformat(),
        "definitions": {
            "active": f"last_season >= {ACTIVE_FROM_SEASON}",
            "under_21": f"active and age < {UNDER_AGE} on reference date",
            "quarters": "Q1 = Jan-Mar, Q4 = Oct-Dec (calendar-year selection cut-off)",
            "expected": "share of days in the period (Feb = 28.25 days)",
        },
        "all_players": distribution(players),
        "active_players": distribution(active),
        "under_21": distribution(young),
        "underdog": underdog(players),
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")

    u21 = result["under_21"]
    allp = result["all_players"]
    print(f"Wrote {args.out}")
    print(f"All players: n={allp['n']}, Q1 share {allp['quarter_share'][0]:.1%}, "
          f"Q4 share {allp['quarter_share'][3]:.1%}, p={fmt_p(allp['chi_square_quarters']['p_value'])}")
    print(f"Under-21 active: n={u21['n']}, Q1 {u21['quarter_share'][0]:.1%}, "
          f"Q4 {u21['quarter_share'][3]:.1%}, Q1:Q4 ratio {u21['q1_q4_ratio']}, "
          f"p={fmt_p(u21['chi_square_quarters']['p_value'])}")
    for row in result["underdog"]:
        print(f"Underdog {row['band']}: median Q1 EUR {row['median_value_q1']:,.0f} (n={row['n_q1']}) "
              f"vs Q4 EUR {row['median_value_q4']:,.0f} (n={row['n_q4']}), "
              f"P(Q4>Q1)={row['prob_q4_greater']}, p={fmt_p(row['p_value'])}")
    print("\nHEADLINES")
    print(f"1. {u21['quarter_share'][0]:.0%} of active under-21 pros are born Jan-Mar "
          f"(expected {EXPECTED_QUARTER_SHARE[0]:.0%}); only {u21['quarter_share'][3]:.0%} Oct-Dec.")
    print(f"2. A Jan-Mar born youngster is {u21['q1_q4_ratio']:.1f}x as likely to be a pro "
          f"as an Oct-Dec born one.")
    mid = result["underdog"][1]
    print(f"3. Late bloomers who survive are worth more: age {mid['band']}, median value "
          f"Q4 EUR {mid['median_value_q4']:,.0f} vs Q1 EUR {mid['median_value_q1']:,.0f} "
          f"(p = {fmt_p(mid['p_value'])}); null result at 18-21.")
    print(f"   (Skew holds across all {allp['n']:,} players: chi2 = "
          f"{allp['chi_square_quarters']['chi2']}, p {fmt_p(allp['chi_square_quarters']['p_value'])})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
