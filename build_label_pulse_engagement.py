"""
Label Pulse extension: collector demand + live-show revenue estimate
----------------------------------------------------------------------
Adds two new signals on top of the existing release-history pipeline
(build_label_pulse.py), kept as a separate script so the original
pipeline's output stays untouched and this addition's data provenance
is easy to audit on its own.

1. COLLECTOR DEMAND (real data). Discogs has no public streaming-listen
   count for a track -- no platform publishes that for arbitrary artists
   without a developer key. What Discogs DOES publish, live and without
   auth, is `community.have` / `community.want` per release: how many
   users on Discogs own a copy or have it on their wantlist. That's a
   real, verifiable collector-demand signal (fetched live below), used
   here as the closest honest proxy available for "how much do people
   care about this artist's catalog" -- explicitly NOT streaming listens,
   and labeled as collector demand everywhere it's shown.

2. ESTIMATED LIVE-SHOW REVENUE (illustrative model, NOT real data).
   There is no public API for artist touring earnings. Checked directly
   before building this: Bandsintown's API returns 403 for an
   unregistered app_id (partner-gated, not self-serve), and Songkick
   closed public API signups years ago. Rather than fabricate "real"
   numbers or skip the question, this builds a transparent estimate:
   each top artist is placed into a touring tier by their REAL release
   rank within their label (rank comes straight out of
   label_pulse_top_artists.json), and each tier carries a stated,
   documented assumption for shows/year, average ticket price, average
   venue capacity, and sellout rate. Every output row is tagged
   is_estimate=true and the tier assumptions are printed in full so the
   estimate can be audited or swapped for real numbers later.
"""
import json, time, ssl, certifi, urllib.request, urllib.error

HEADERS = {"User-Agent": "LabelPulseProject/1.0 (+github.com/adieckstein64-max/dj-label-pulse)"}
SSL_CTX = ssl.create_default_context(cafile=certifi.where())


def discogs_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(10)
                continue
            raise
    raise RuntimeError(f"Failed to fetch {url} after retries")


LABEL_IDS = {"Innervisions": 50166, "Keinemusik": 150816}


def normalize_artist(name):
    """Strip Discogs' same-name disambiguation markers -- '(3)' suffixes on a
    collided name and trailing '*' -- so raw feed strings like
    'Reznik (3) & Mikesh*' match the cleaned canonical name 'Reznik & Mikesh'
    used in label_pulse_top_artists.json. Missing this silently drops that
    artist's releases from the demand sample (a real bug caught by a 0 result
    that turned out to be a matching gap, not real zero demand)."""
    import re
    return re.sub(r"\s*\(\d+\)", "", name).replace("*", "").strip()


with open("label_pulse_top_artists.json") as f:
    top_artists = json.load(f)
wanted = {(a["label"], a["artist"]): a for a in top_artists}

# --- Step 1: pull raw release listings (id + artist + catno) live from Discogs ---
raw_by_label = {}
for label, label_id in LABEL_IDS.items():
    rows, page = [], 1
    while True:
        data = discogs_get(f"https://api.discogs.com/labels/{label_id}/releases?page={page}&per_page=100")
        rows.extend({"id": r["id"], "catno": r["catno"], "artist": r["artist"]} for r in data["releases"])
        if page >= data["pagination"]["pages"]:
            break
        page += 1
        time.sleep(1)
    raw_by_label[label] = rows
    print(f"{label}: {len(rows)} raw release rows fetched")

# --- Step 2: canonical (deduped by catno) release ids per top artist ---
release_ids_by_artist = {}
for label, rows in raw_by_label.items():
    seen_catno = set()
    for r in rows:
        key = (label, normalize_artist(r["artist"]))
        if key not in wanted or r["catno"] in seen_catno:
            continue
        seen_catno.add(r["catno"])
        release_ids_by_artist.setdefault(key, []).append(r["id"])

# --- Step 3: fetch community have/want per release, aggregate per artist (real data) ---
engagement_rows = []
call_count = 0
for (label, artist), ids in release_ids_by_artist.items():
    have_sum = want_sum = fetched = 0
    for rid in ids:
        d = discogs_get(f"https://api.discogs.com/releases/{rid}")
        comm = d.get("community", {})
        have_sum += comm.get("have", 0)
        want_sum += comm.get("want", 0)
        fetched += 1
        call_count += 1
        time.sleep(20 if call_count % 20 == 0 else 1.2)
    engagement_rows.append({
        "label": label,
        "artist": artist,
        "releases_sampled": fetched,
        "discogs_have_total": have_sum,
        "discogs_want_total": want_sum,
        "collector_demand_index": have_sum + want_sum,
    })
    print(f"{label} / {artist}: {fetched} releases sampled, demand index {have_sum + want_sum}")

with open("label_pulse_engagement.json", "w") as f:
    json.dump(engagement_rows, f, indent=2)

# --- Step 4: live-show revenue ESTIMATE, tiered by real release rank (illustrative) ---
TOURING_TIERS = {
    "A": {"rnk_max": 2,  "shows_per_year": 45, "avg_ticket_usd": 70, "avg_capacity": 1800, "sellout_rate": 0.65},
    "B": {"rnk_max": 4,  "shows_per_year": 30, "avg_ticket_usd": 50, "avg_capacity": 900,  "sellout_rate": 0.60},
    "C": {"rnk_max": 99, "shows_per_year": 15, "avg_ticket_usd": 35, "avg_capacity": 400,  "sellout_rate": 0.55},
}


def tier_for_rank(rnk):
    for name, t in TOURING_TIERS.items():
        if rnk <= t["rnk_max"]:
            return name, t


estimate_rows = []
for a in top_artists:
    tier_name, t = tier_for_rank(a["rnk"])
    est_revenue = round(t["shows_per_year"] * t["avg_ticket_usd"] * t["avg_capacity"] * t["sellout_rate"])
    estimate_rows.append({
        "label": a["label"],
        "artist": a["artist"],
        "release_rank": a["rnk"],
        "release_count": a["release_count"],
        "touring_tier": tier_name,
        "shows_per_year_assumed": t["shows_per_year"],
        "avg_ticket_usd_assumed": t["avg_ticket_usd"],
        "avg_capacity_assumed": t["avg_capacity"],
        "sellout_rate_assumed": t["sellout_rate"],
        "estimated_annual_live_revenue_usd": est_revenue,
        "is_estimate": True,
    })

with open("label_pulse_earnings_estimate.json", "w") as f:
    json.dump({"tier_assumptions": TOURING_TIERS, "artists": estimate_rows}, f, indent=2)

print("\nTouring tier assumptions (stated in full for audit):")
print(json.dumps(TOURING_TIERS, indent=2))

# --- Step 5: does release frequency track with demand or estimated earnings? ---
demand_by_key = {(r["label"], r["artist"]): r["collector_demand_index"] for r in engagement_rows}
combined = []
for e in estimate_rows:
    key = (e["label"], e["artist"])
    combined.append({
        "label": e["label"],
        "artist": e["artist"],
        "release_count": e["release_count"],
        "collector_demand_index": demand_by_key.get(key, 0),
        "estimated_annual_live_revenue_usd": e["estimated_annual_live_revenue_usd"],
    })


def pearson(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    vx = sum((x - mx) ** 2 for x in xs)
    vy = sum((y - my) ** 2 for y in ys)
    return cov / ((vx * vy) ** 0.5) if vx and vy else float("nan")


r_counts = [c["release_count"] for c in combined]
r_demand = [c["collector_demand_index"] for c in combined]
r_revenue = [c["estimated_annual_live_revenue_usd"] for c in combined]

corr_demand = round(pearson(r_counts, r_demand), 3)
corr_revenue = round(pearson(r_counts, r_revenue), 3)

with open("label_pulse_release_impact.json", "w") as f:
    json.dump({
        "rows": combined,
        "n": len(combined),
        "pearson_release_count_vs_collector_demand": corr_demand,
        "pearson_release_count_vs_estimated_revenue": corr_revenue,
        "note": f"n={len(combined)} (top artists across both labels) is far too small for a statistically "
                "meaningful correlation -- these coefficients describe this specific sample, not a general claim "
                "about release frequency and demand/earnings. Read as a directional pattern to look into further, "
                "not a finding.",
    }, f, indent=2)

print(f"\nrelease_count vs collector_demand_index: r = {corr_demand}")
print(f"release_count vs estimated_annual_live_revenue: r = {corr_revenue}  (n={len(combined)}, not statistically meaningful)")
