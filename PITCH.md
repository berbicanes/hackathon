# Late Bloomers — 3-minute demo

Live: https://berbicanes.github.io/hackathon/ (opens in Bosnian; switch top right)

Before going on stage: open the site on step 1 (**Problem**), zoom the browser
to ~125%. The app is a 3-step flow: **1 Problem → 2 Vaša ekipa → 3 Odluka** (stepper in the
header; each step has its own link: `#problem`, `#squad`, `#decision`). Have a second
browser tab with the sample already loaded on step 3 as backup.

## Script

**0:00 – 0:20 · Hook**

> Every year at U10 trials, a kid born in January stands next to a kid born in December.
> Same "age group", but one of them is almost a year older. Guess who gets picked.
> Coaches aren't doing it on purpose. They just can't see it. We built something so they can.

**0:20 – 1:00 · Step 1, Problem (for the data person)**

- Point at the big number: **32% of active under-21 pros are born January–March.**
  By days in the calendar it should be about 25%. Only **18%** are born October–December.
- "So Q1-born players are **1.8×** as common as Q4-born among under-21 pros."
  (Say "as common", not "as likely to make it": we count who is in the pro pool, we don't
  follow children over time.)
- Toggle *All players*: same picture across **50,100** players.
- Small grey stats line under the chart: n = 5,538, chi-square, **p ≈ 10⁻⁵⁰**. Expected line is weighted by days per
  month, not a flat 25%.
- Open **Za analitičare: detaljna provjera** (collapsed by default) and point at the
  underdog table: "We also checked whether the late-born players who survive
  are better. Within the same age band, never pooled. At 18–21: **no difference**, and we
  show that. At 22–25 the late-born are worth more: **€700k vs €600k median**,
  p = 0.0007. We tested three age bands, so the bar is 0.017, not 0.05: 22–25 clears it,
  26–29 (p = 0.03) does not, so we don't claim it. Small effect. A clue, not proof."

**1:00 – 2:35 · Steps 2 and 3, Vaša ekipa → Odluka (for the coach) — the demo in 5 moves**

1. **Step 2:** click **Provjerite svoju ekipu** → **Probajte s primjerom** (orange banner:
   synthetic, invented kids). "**14 of 20** born in the first half of the year. That's the
   bias, inside one squad." Click **Pogledajte odluku →**.
2. **The recommendation:** *"Proširite grupu za 3 mjesta: 3 kasno rođena talenta."* "We
   don't cut anyone. The 10 he picked stay. We ask him to add three for a second look in
   six months: Ena, Benjamin and Hana."
3. **How sure we are:** "≈ 2,2 boda po mjesecu, raspon 1,1–3,3. Every month of age is
   worth about two points here. In a small or noisy squad the app says the adjustment is
   only a rough guide."
4. **Kako radi (scatter plot):** "Every dot is a child: age across, score up. The dashed
   line is what's expected for that age. The three named children are exactly the three in
   the recommendation, the same three on the printed report."
5. **Tap Ena:** "6 months younger than the squad average, rank 16 on raw score, rank 7 for
   age. *Take a second look.* The tool never says a child is bad; worst case it says
   *keep developing*."

Only if asked: **Prikaži sve igrače (20)** opens the full ranking with the
Preporuka / Sirova ocjena / Prilagođeno starosti comparison; step 2 has settings for
lower-is-better tests and for a 1 September or 1 April selection year.

**2:35 – 3:00 · Close**

- Scroll to **Šta vaš klub može uraditi već u ponedjeljak**: three free changes, one line
  each (tap one to open it).
  Print button → one-page report a coach can pin on the wall or take to the board.
- "It's free, works on a phone, in Bosnian, and the squad file never leaves the device.
  No server, no login, no tracking. Kids' data stays with the coach."
- "Proven on 50,000 pros. Usable on Monday by any grassroots coach."

## Likely jury questions

**Isn't RAE already known?**
Yes, that's the point. It's been in research for 30+ years and it still happens at every
trial. What's missing is a tool a volunteer coach can actually use. That's what we built.

**Why is "expected" not exactly 25%?**
Quarters have different numbers of days. We weight by days per month (Feb = 28.25), so
Q1 is expected at 24.7%. Using flat 25% would slightly overstate the effect.

**Births aren't uniform across the year anyway.**
True, and it's in the limitations. But the seasonal variation in births is a few percent;
here Q1 is 32% vs Q4 18%. That gap is far beyond any birth seasonality.

**Market value as a measure of quality?**
It's imperfect, we say so. We use it only for the underdog check, always within the same
age band, with a rank test (Mann-Whitney) so a few superstar values can't drive it. And we
report the null result at 18–21.

**You ran three tests. Multiple comparisons?**
Yes: three age bands, so the Bonferroni threshold is 0.05 ÷ 3 = 0.017. The 22–25 result
(p = 0.0007) holds. The 26–29 result (p = 0.03) does not, and the table says so.

**"1.8×" what, exactly?**
Q1-born players are 1.8× as common as Q4-born among under-21 pros. It's a count of who is
in the pool today, adjusted for days per quarter. It is not a child's individual odds of
turning pro; we'd need to follow birth cohorts for that.

**Isn't this dataset biased itself?**
It's professionals with a Transfermarkt profile, mostly Europe.

**England's cut-off is 1 September, not 1 January. Doesn't that break your quarters?**
We checked. Without England the under-21 ratio goes from 1.79× to 1.81×; without England,
Wales and Japan (April cut-off) it is 1.84×. So the mixing hid a little of the effect, it
didn't create it. England measured from 1 September points the same way (1.5×), but with
only 175 under-21 players that is not significant on its own (p = 0.065), and we say so.
Across all 1,762 English players it is clear (2.1×). The table is on step 1 under “Za analitičare”.

**What does "Na granici" mean, and why is nobody borderline in the demo?**
"Na granici" are the children right below the line, where the uncertainty of the
estimate could swap the order (djeca odmah ispod granice, gdje nesigurnost procjene može
zamijeniti redoslijed). We walk down the age-adjusted ranking from the last place, take
each child while their gap is inside that uncertainty, stop at the first who is not, and
never take more than three. In the demo with 10 places the next child, Asja, is too far,
so the list stops there. Set 8 places and you get "1 kasno rođeni talenat + 3 na granici".

**Why widen the group instead of swapping children?**
Because a swap means telling three early-born kids they are out on the basis of a
statistical adjustment. Widening costs three training places and loses nobody; the
second-look kids are reassessed in six months.

**How sure are you about the 2.2 points per month?**
It comes with a 95% interval (1.1 to 3.3 in the sample). If the interval includes zero,
or the squad has fewer than 10 children, the app says the adjustment is only a guide.

**What about sprint times, or England's September cut-off?**
Step 2 has both settings: "lower score is better", and the selection year starting
1 January, 1 September or 1 April. Both are unit-tested.

**How does the age adjustment work?**
Straight-line fit of score on age in months, across the squad. The fair score is how far
a kid is above or below what's typical for their exact age, put back on the original
scale. If older kids don't score higher in your squad, nothing changes. That's tested.

**What about small squads?**
With fewer than 10 players the app warns that the trend is rough. Results are framed as
"take a second look", never as a decision.

**Biological maturity vs birth date?**
Birth date is the part every coach has today, at zero cost. Maturity (growth spurts) is
the next layer. Bio-banding needs height measurements and a formula; that's a natural
next step.

**Privacy / GDPR with children's data?**
There's no server. The CSV is read by the browser and analysed in memory. Nothing is
uploaded, stored or tracked. Closing the tab deletes everything.

**Could this be misused to rank kids harder?**
The output is deliberately soft: no "bad" labels, advice is keep / second look /
reassess. The whole point is to *widen* the group, not to cut faster.

**How would a club use it?**
Export your test results to CSV (Excel works, semicolons and dd.mm.yyyy dates are fine),
upload, look at who changes, print the one-page report for the coaching meeting.

**What's next?**
Federation-level view across clubs, maturity estimates, and tracking reassessed kids
over time to measure how many late bloomers we kept.
