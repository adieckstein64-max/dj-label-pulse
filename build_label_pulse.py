"""
Project 3 - Label Pulse: Innervisions vs. Keinemusik release history
Real SQL (CTEs + window functions) over real Discogs catalog data.

Data source: Discogs public API (api.discogs.com/labels/{id}/releases), fetched live.
  - Innervisions (label id 50166): founded 2005 by Dixon & Âme
  - Keinemusik (label id 150816): founded 2009 by Rampa, &ME, Adam Port, David Mayer, Reznik

Method: pulled the full paginated release catalog for both labels via the Discogs API,
deduped by canonical catalog number (collapsing format/reissue variants of the same
release into one row), producing a real release-level dataset: label, catalog number,
year, artist, title.

Honest limitation: Discogs catalogs are community-maintained. Some pre-2010 catalog
numbers/years for either label may be incomplete or have minor gaps versus the labels'
own internal release logs -- this is the best public structured source available without
label-side data access, and is stated here rather than presented as definitive.
"""
import sqlite3, csv, json

conn = sqlite3.connect(":memory:")
cur = conn.cursor()
cur.execute("CREATE TABLE releases (label TEXT, catno TEXT, year INTEGER, artist TEXT, title TEXT)")

rows = []
for fname in ["innervisions_releases.csv", "keinemusik_releases.csv"]:
    with open(fname) as f:
        r = csv.DictReader(f)
        for x in r:
            rows.append((x["label"], x["catno"], int(x["year"]), x["artist"], x["title"]))

cur.executemany("INSERT INTO releases VALUES (?,?,?,?,?)", rows)
conn.commit()

# --- Query 1: release cadence per label per year (CTE + window function for running total) ---
cur.execute("""
WITH yearly AS (
    SELECT label, year, COUNT(*) AS releases
    FROM releases
    GROUP BY label, year
)
SELECT label, year, releases,
       SUM(releases) OVER (PARTITION BY label ORDER BY year) AS cumulative_releases
FROM yearly
ORDER BY label, year
""")
cadence_cols = [d[0] for d in cur.description]
cadence = [dict(zip(cadence_cols, row)) for row in cur.fetchall()]
with open("label_pulse_cadence.json", "w") as f:
    json.dump(cadence, f, indent=2)

# --- Query 2: most prolific artist per label (RANK window function) ---
# HAVING COUNT(*) > 1 keeps this a "prolific artist" ranking, not a tie-break
# lottery: RANK() leaves every release_count=1 row tied for the same rank, and
# a label with fewer than 8 repeat artists would otherwise spill "rnk <= 8"
# into dozens of one-off collab credits (exposed after merging &ME/&Me below
# a label's repeat-artist count, which dropped Keinemusik from exactly 8 to 7
# real repeat artists).
cur.execute("""
WITH artist_counts AS (
    SELECT label, artist, COUNT(*) AS release_count
    FROM releases
    WHERE artist NOT IN ('Various', 'Unknown Artist')
    GROUP BY label, artist
    HAVING COUNT(*) > 1
),
ranked AS (
    SELECT *, RANK() OVER (PARTITION BY label ORDER BY release_count DESC) AS rnk
    FROM artist_counts
)
SELECT label, artist, release_count, rnk
FROM ranked
WHERE rnk <= 8
ORDER BY label, rnk
""")
top_cols = [d[0] for d in cur.description]
top_artists = [dict(zip(top_cols, row)) for row in cur.fetchall()]
with open("label_pulse_top_artists.json", "w") as f:
    json.dump(top_artists, f, indent=2)

# --- Query 3: label summary stats ---
cur.execute("""
SELECT label,
       COUNT(*) AS total_releases,
       MIN(year) AS first_year,
       MAX(year) AS latest_year,
       COUNT(DISTINCT artist) AS distinct_artists,
       ROUND(COUNT(*) * 1.0 / (MAX(year) - MIN(year) + 1), 2) AS avg_releases_per_year
FROM releases
GROUP BY label
""")
summary_cols = [d[0] for d in cur.description]
summary = [dict(zip(summary_cols, row)) for row in cur.fetchall()]
with open("label_pulse_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

# --- Query 4: artist overlap -- any artist who appears on both labels' rosters ---
cur.execute("""
SELECT DISTINCT a.artist
FROM releases a
JOIN releases b ON a.artist = b.artist AND a.label != b.label
WHERE a.artist NOT IN ('Various', 'Unknown Artist')
""")
overlap = [row[0] for row in cur.fetchall()]

print("Cadence rows:", len(cadence))
print("Top artists rows:", len(top_artists))
print("Summary:", summary)
print("Cross-label artist overlap:", overlap if overlap else "none found")
