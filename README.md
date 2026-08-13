# Project 3 — Label Pulse: Innervisions vs. Keinemusik

SQL + Python + data visualization project. Answers: how does release output compare between
two electronic music labels over their full histories, who are the most prolific artists on
each roster, and do the labels' artist rosters overlap.

Built on labels I actually play as a DJ, not a stock dataset — the honesty standard for this
portfolio is the same as Projects 1 and 2: real data, real queries, real (sometimes unglamorous)
limitations stated up front.

## Data sources (live, from Discogs' public JSON API)

- `innervisions_releases.csv` — 148 canonical releases, Innervisions (founded 2005), 2005-2026
- `keinemusik_releases.csv` — 69 canonical releases, Keinemusik (founded 2009), 2009-2026

Pulled via `api.discogs.com/labels/{id}/releases` (no auth required), then deduped by canonical
catalog number — Discogs lists a separate row per format/pressing (vinyl, digital, reissue) for
the same release, so raw pulls (617 + 141 rows) were collapsed down to one row per release.

## Method

`build_label_pulse.py` loads both CSVs into a local SQL database and runs real SQL:

- A CTE aggregates releases per label per year, then a `SUM() OVER (PARTITION BY label ORDER BY year)`
  window function computes a running cumulative total.
- A second CTE counts releases per artist per label, then `RANK() OVER (PARTITION BY label ORDER BY release_count DESC)`
  ranks the roster to find each label's most prolific artists.
- A summary `GROUP BY` query computes total releases, distinct-artist count, and average releases/year per label.
- A self-join (`a.artist = b.artist AND a.label != b.label`) finds any artist who released on both labels.

Output: `label_pulse_cadence.json`, `label_pulse_top_artists.json`, `label_pulse_summary.json`.

## Headline results

- Innervisions: 148 releases, 71 distinct artists, 6.73 releases/year average, peaked at 12 releases in 2014.
- Keinemusik: 69 releases, 31 distinct artists, 3.83 releases/year average, steadier cadence (3-5/year most years).
- Most prolific: Âme (11 releases) on Innervisions; Rampa (9 releases) on Keinemusik.
- Cross-label overlap: **Rampa** (Keinemusik co-founder) has also released directly on Innervisions
  ("Hall Of Violence EP," 2017; "They Will EP," 2019) — a real, verifiable example of overlap between
  the two labels' rosters, found in the data rather than assumed going in.

## Honest limitations

Discogs is community-maintained, not the labels' internal release logs — pre-2010 entries may have
small gaps. 2026 is a partial year at the time of data collection, so the visible drop in 2025-2026
release counts is a data-cutoff artifact, not a real slowdown, and is flagged as such rather than
left to imply a trend the data can't support. Catalog numbers on Innervisions are not strictly
chronological (e.g. IV109 is dated 2026 despite being numbered before IV110-116, which are dated
2024-2025) — noted so the year-based analysis isn't mistaken for a catalog-number timeline.

## Deliverable

`LabelPulseProject.jsx` — standalone React component (Tailwind utility classes, no external chart
library), matching the interaction pattern of Project 2 on purpose: sortable/comparable views,
color-coded categories, and a Methodology tab that states limitations plainly. Four tabs: Overview
(cadence line chart, headline stats), Roster (horizontal bar charts of top artists per label),
Engagement (collector demand + estimated live revenue, below), Methodology (data sources, SQL
approach, limitations above).

## Extension: collector demand & estimated live-show revenue

Added after the original three-tab version shipped, to answer: who's actually in demand, who
likely earns more from live shows, and does release frequency track with either. Two very
different kinds of data here, kept visually distinct in the UI on purpose:

- **Collector demand (real data).** No platform publishes real streaming-listen counts for
  arbitrary artists without a developer key, so this uses the closest honest signal that's
  actually public: Discogs' `community.have` / `community.want` counts, fetched live per release
  (`build_label_pulse_engagement.py`, ~87 individual `api.discogs.com/releases/{id}` calls across
  the top 8 artists per label). Labeled "collector demand" everywhere it's shown — never "listens."
- **Estimated live-show revenue (modeled, not real).** Checked two real touring APIs before
  building this: Bandsintown returns a 403 for an unregistered `app_id` (partner-gated, not
  self-serve), and Songkick closed public API signups years ago. There's no legitimate free source
  for real per-artist touring earnings, so rather than fabricate numbers or skip the question, this
  builds a transparent estimate: each artist is bucketed into a touring tier by their real release
  rank (from the existing `RANK()` query), and each tier carries stated shows/year, ticket price,
  venue capacity, and sellout-rate assumptions (see `label_pulse_earnings_estimate.json` for the
  full tier table). Every value from this model is flagged `is_estimate: true` and shown with a
  hatched fill + "modeled estimate" badge in the UI.
- **Does release frequency track with either?** `label_pulse_release_impact.json` joins
  release count against both signals: r = 0.666 for release count vs. collector demand, r = 0.841
  for release count vs. estimated revenue (n = 16 top artists total — nowhere near enough for a
  real correlation claim, treated as directional at best). The second number is also partly
  circular: revenue tier is assigned directly from release rank, so that correlation is partly
  baked into the model's own assumptions, not independent evidence.
- **A real bug the data caught.** Discogs disambiguates same-named artists in its raw feed with
  suffixes like `(3)` and a trailing `*` (e.g. `Reznik (3) & Mikesh*` for the canonical
  `Reznik & Mikesh`). An early version of the matching logic didn't normalize those markers and
  silently returned a demand index of 0 for that artist — which would have read as "nobody wants
  this" rather than "the string didn't match." Fixed by stripping the markers before matching;
  noted here because a caught data bug is worth more than pretending it didn't happen.

Output: `label_pulse_engagement.json`, `label_pulse_earnings_estimate.json`,
`label_pulse_release_impact.json`.

## Tools

Python, SQL (CTEs, JOINs, RANK() and SUM() OVER window functions), hand-rolled SVG for the
cadence chart and roster bars.
