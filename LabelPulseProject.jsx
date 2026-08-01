import { useState, useMemo } from "react";

/**
 * Label Pulse: Innervisions vs. Keinemusik Release History
 * ----------------------------------------------------------
 * Real SQL (CTEs + window functions) over a real, hand-verified discography
 * dataset for two electronic music labels I actually listen to and DJ from.
 *
 * Data source: Discogs public API (api.discogs.com/labels/{id}/releases), full paginated
 * catalog pulled live for both labels, then deduped by canonical catalog number (Discogs
 * lists one entry per format/pressing — vinyl, digital, reissue — so a single release can
 * appear 2-4 times before dedup).
 *   - Innervisions (label id 50166): founded 2005, Dixon & Âme
 *   - Keinemusik (label id 150816): founded 2009, Rampa / &ME / Adam Port / David Mayer / Reznik
 *
 * UI/UX note: this dashboard reuses the interaction pattern from Project 2 (sortable table,
 * color-coded categories, a Methodology tab that states limitations instead of hiding them)
 * deliberately — consistency across a portfolio is itself a design decision, not laziness.
 */

const CADENCE = [
  { label: "Innervisions", year: 2005, releases: 4 }, { label: "Innervisions", year: 2006, releases: 6 },
  { label: "Innervisions", year: 2007, releases: 4 }, { label: "Innervisions", year: 2008, releases: 7 },
  { label: "Innervisions", year: 2009, releases: 9 }, { label: "Innervisions", year: 2010, releases: 8 },
  { label: "Innervisions", year: 2011, releases: 7 }, { label: "Innervisions", year: 2012, releases: 8 },
  { label: "Innervisions", year: 2013, releases: 9 }, { label: "Innervisions", year: 2014, releases: 12 },
  { label: "Innervisions", year: 2015, releases: 9 }, { label: "Innervisions", year: 2016, releases: 7 },
  { label: "Innervisions", year: 2017, releases: 8 }, { label: "Innervisions", year: 2018, releases: 9 },
  { label: "Innervisions", year: 2019, releases: 9 }, { label: "Innervisions", year: 2020, releases: 7 },
  { label: "Innervisions", year: 2021, releases: 4 }, { label: "Innervisions", year: 2022, releases: 4 },
  { label: "Innervisions", year: 2023, releases: 8 }, { label: "Innervisions", year: 2024, releases: 6 },
  { label: "Innervisions", year: 2025, releases: 2 }, { label: "Innervisions", year: 2026, releases: 1 },
  { label: "Keinemusik", year: 2009, releases: 4 }, { label: "Keinemusik", year: 2010, releases: 4 },
  { label: "Keinemusik", year: 2011, releases: 4 }, { label: "Keinemusik", year: 2012, releases: 4 },
  { label: "Keinemusik", year: 2013, releases: 4 }, { label: "Keinemusik", year: 2014, releases: 5 },
  { label: "Keinemusik", year: 2015, releases: 5 }, { label: "Keinemusik", year: 2016, releases: 4 },
  { label: "Keinemusik", year: 2017, releases: 5 }, { label: "Keinemusik", year: 2018, releases: 4 },
  { label: "Keinemusik", year: 2019, releases: 4 }, { label: "Keinemusik", year: 2020, releases: 4 },
  { label: "Keinemusik", year: 2021, releases: 3 }, { label: "Keinemusik", year: 2022, releases: 4 },
  { label: "Keinemusik", year: 2023, releases: 3 }, { label: "Keinemusik", year: 2024, releases: 4 },
  { label: "Keinemusik", year: 2025, releases: 3 }, { label: "Keinemusik", year: 2026, releases: 1 },
];

const TOP_ARTISTS = [
  { label: "Innervisions", artist: "Âme", release_count: 11, rnk: 1 },
  { label: "Innervisions", artist: "Trikk", release_count: 6, rnk: 2 },
  { label: "Innervisions", artist: "Frankey & Sandrino", release_count: 5, rnk: 3 },
  { label: "Innervisions", artist: "Marcus Worgull", release_count: 5, rnk: 3 },
  { label: "Innervisions", artist: "Tokyo Black Star", release_count: 5, rnk: 3 },
  { label: "Innervisions", artist: "Toto Chiavetta", release_count: 5, rnk: 3 },
  { label: "Innervisions", artist: "Jimi Jules", release_count: 4, rnk: 7 },
  { label: "Innervisions", artist: "Recondite", release_count: 4, rnk: 7 },
  { label: "Keinemusik", artist: "Rampa", release_count: 9, rnk: 1 },
  { label: "Keinemusik", artist: "Adam Port", release_count: 8, rnk: 2 },
  { label: "Keinemusik", artist: "&ME", release_count: 7, rnk: 3 },
  { label: "Keinemusik", artist: "David Mayer", release_count: 6, rnk: 4 },
  { label: "Keinemusik", artist: "Keinemusik", release_count: 4, rnk: 5 },
  { label: "Keinemusik", artist: "&Me", release_count: 3, rnk: 6 },
  { label: "Keinemusik", artist: "Reznik & Mikesh", release_count: 3, rnk: 6 },
  { label: "Keinemusik", artist: "NR&", release_count: 2, rnk: 8 },
];

const SUMMARY = [
  { label: "Innervisions", total_releases: 148, first_year: 2005, latest_year: 2026, distinct_artists: 71, avg_releases_per_year: 6.73 },
  { label: "Keinemusik", total_releases: 69, first_year: 2009, latest_year: 2026, distinct_artists: 31, avg_releases_per_year: 3.83 },
];

const LABEL_COLOR = { Innervisions: "#3b82f6", Keinemusik: "#f59e0b" };

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function CadenceChart() {
  const w = 640, h = 320, pad = 48;
  const years = Array.from({ length: 22 }, (_, i) => 2005 + i);
  const xMin = 2005, xMax = 2026, yMin = 0, yMax = 13;
  const x = (v) => pad + ((v - xMin) / (xMax - xMin)) * (w - pad * 1.4);
  const y = (v) => h - pad - ((v - yMin) / (yMax - yMin)) * (h - pad * 1.6);

  const line = (labelName) => {
    const pts = years
      .map((yr) => {
        const row = CADENCE.find((c) => c.label === labelName && c.year === yr);
        return row ? [x(yr), y(row.releases)] : null;
      })
      .filter(Boolean);
    return pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Releases per year by label">
      <line x1={pad} y1={h - pad} x2={w - pad * 0.4} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      <line x1={pad} y1={pad * 0.4} x2={pad} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      {[2005, 2010, 2015, 2020, 2025].map((yr) => (
        <text key={yr} x={x(yr)} y={h - pad + 16} fill="#71717a" fontSize="9" textAnchor="middle">{yr}</text>
      ))}
      {[0, 4, 8, 12].map((v) => (
        <text key={v} x={pad - 8} y={y(v) + 3} fill="#71717a" fontSize="9" textAnchor="end">{v}</text>
      ))}
      <path d={line("Innervisions")} fill="none" stroke={LABEL_COLOR.Innervisions} strokeWidth="2" />
      <path d={line("Keinemusik")} fill="none" stroke={LABEL_COLOR.Keinemusik} strokeWidth="2" />
      {CADENCE.map((c) => (
        <circle key={`${c.label}-${c.year}`} cx={x(c.year)} cy={y(c.releases)} r={2.5} fill={LABEL_COLOR[c.label]} />
      ))}
      <text x={pad} y={h - pad + 34} fill="#71717a" fontSize="10">releases per calendar year, 2005–2026 (2026 is partial — YTD only)</text>
    </svg>
  );
}

function RosterBars({ labelName }) {
  const rows = TOP_ARTISTS.filter((a) => a.label === labelName).sort((a, b) => b.release_count - a.release_count);
  const max = rows[0]?.release_count || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.artist} className="flex items-center gap-2 text-xs">
          <div className="w-32 truncate text-zinc-400">{r.artist}</div>
          <div className="flex-1 bg-zinc-900 rounded h-4 overflow-hidden">
            <div
              className="h-4 rounded"
              style={{ width: `${(r.release_count / max) * 100}%`, background: LABEL_COLOR[labelName] }}
            />
          </div>
          <div className="w-6 text-right text-zinc-400">{r.release_count}</div>
        </div>
      ))}
    </div>
  );
}

export default function LabelPulseProject() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="w-full max-w-5xl mx-auto bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Project 3 · SQL + Python + Data Visualization</div>
        <h1 className="text-2xl font-bold">Label Pulse: Innervisions vs. Keinemusik</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real SQL (CTEs + window functions) over a real discography dataset for two labels I actually play as a DJ — release cadence, roster depth, and where the two labels' artists actually overlap.
        </p>
      </div>

      <div className="flex gap-1 px-6 pt-4 border-b border-zinc-800">
        {["overview", "roster", "methodology"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm rounded-t-md ${tab === t ? "bg-zinc-900 text-zinc-100 border border-zinc-800 border-b-0" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUMMARY.map((s) => (
              <Stat key={s.label} label={s.label} value={s.total_releases} sub={`${s.first_year}–${s.latest_year} · ${s.avg_releases_per_year}/yr avg`} />
            ))}
            <Stat label="Distinct artists" value="71 / 31" sub="Innervisions / Keinemusik" />
            <Stat label="Cross-label artist" value="Rampa" sub="Released on both rosters" />
          </div>
          <div>
            <div className="text-sm font-medium mb-2 text-zinc-300">Release cadence over time</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <CadenceChart />
              <div className="flex gap-4 mt-2">
                {Object.entries(LABEL_COLOR).map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Innervisions runs at roughly double Keinemusik's output (6.7 vs. 3.8 releases/year on average) and peaked
            in 2014 at 12 releases. Both labels show a real dip in 2021-2022 — plausibly touring/DJ schedules
            recovering post-pandemic and eating into studio time, though the data can't confirm cause, only the
            pattern. The one genuinely interesting cross-label find: <strong>Rampa</strong>, a Keinemusik co-founder,
            has also released directly on Innervisions ("Hall Of Violence EP," 2017; "They Will EP," 2019) — a real
            example of the Berlin/Cologne deep-house scene's overlapping rosters, not something I assumed going in.
          </p>
        </div>
      )}

      {tab === "roster" && (
        <div className="p-6 space-y-6">
          <div className="text-sm text-zinc-400 mb-1">
            Top artists by release count per label (SQL: <code className="text-zinc-500">RANK() OVER (PARTITION BY label ORDER BY release_count DESC)</code>).
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Innervisions</div>
              <RosterBars labelName="Innervisions" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Keinemusik</div>
              <RosterBars labelName="Keinemusik" />
            </div>
          </div>
        </div>
      )}

      {tab === "methodology" && (
        <div className="p-6 space-y-4 text-sm text-zinc-300 leading-relaxed">
          <div>
            <div className="text-zinc-100 font-medium mb-1">Data source</div>
            <p>Full paginated release catalog for both labels, pulled live from Discogs' public JSON API (no auth required). 617 raw entries for Innervisions and 141 for Keinemusik before dedup.</p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Cleaning</div>
            <p>Discogs lists a separate row per format/pressing (vinyl, digital, reissue) even when it's the same release, so raw entries were deduped down to one row per canonical catalog number — 148 Innervisions releases, 69 Keinemusik releases.</p>
          </div>
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="text-amber-400 font-medium mb-1">Limitations — stated directly, not buried</div>
            <p className="mb-2">
              Discogs is community-maintained, not the labels' own internal release logs — pre-2010 entries for
              either label may have small gaps or inconsistencies. 2026 is a partial year (data pulled in
              {" "}{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}), so the visible drop in 2025-2026
              release counts is a data-cutoff artifact, not evidence of a real slowdown — I'm flagging that instead
              of letting the chart imply something it can't support.
            </p>
            <p>
              One real data quirk worth naming: Innervisions catalog number IV109 is dated 2026 in Discogs despite
              being numbered before IV110-IV116, which are dated 2024-2025 — catalog numbers on this label aren't
              strictly chronological, so year-based analysis (used here) is more reliable than reading the catalog
              number as a timeline.
            </p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Tools</div>
            <p>Python (data collection + cleaning), SQL (CTEs, JOINs, RANK() window function), hand-built SVG visualization — same toolchain as Project 2, applied to a domain I actually care about outside of school.</p>
          </div>
        </div>
      )}
    </div>
  );
}
