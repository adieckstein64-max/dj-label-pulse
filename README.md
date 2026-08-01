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

`build_label_pulse.py` loads both CSVs into SQLite and runs real SQL:

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
color-coded categories, and a Methodology tab that states limitations plainly. Three tabs: Overview
(cadence line chart, headline stats), Roster (horizontal bar charts of top artists per label),
Methodology (data sources, SQL approach, limitations above).

## Tools

Python, SQLite (CTEs, JOINs, RANK() and SUM() OVER window functions), hand-rolled SVG for the
cadence chart and roster bars.
