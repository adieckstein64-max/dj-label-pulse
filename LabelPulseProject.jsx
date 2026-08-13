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
  { label: "Keinemusik", artist: "&ME", release_count: 10, rnk: 1 },
  { label: "Keinemusik", artist: "Rampa", release_count: 9, rnk: 2 },
  { label: "Keinemusik", artist: "Adam Port", release_count: 8, rnk: 3 },
  { label: "Keinemusik", artist: "David Mayer", release_count: 6, rnk: 4 },
  { label: "Keinemusik", artist: "Keinemusik", release_count: 4, rnk: 5 },
  { label: "Keinemusik", artist: "Reznik & Mikesh", release_count: 3, rnk: 6 },
  { label: "Keinemusik", artist: "NR&", release_count: 2, rnk: 7 },
];

const SUMMARY = [
  { label: "Innervisions", total_releases: 148, first_year: 2005, latest_year: 2026, distinct_artists: 71, avg_releases_per_year: 6.73 },
  { label: "Keinemusik", total_releases: 69, first_year: 2009, latest_year: 2026, distinct_artists: 30, avg_releases_per_year: 3.83 },
];

const LABEL_COLOR = { Innervisions: "#3b82f6", Keinemusik: "#f59e0b" };

/**
 * Editorial background on each label — real facts (founding story, founders,
 * sound), not generated from the Discogs data itself. Sourced from label/press
 * coverage (Innervisions' own About page + Mixmag; Keinemusik's Wikipedia entry
 * + Forbes/Crack Magazine profiles) specifically so this tab isn't just the
 * same numbers restated in prose.
 */
const LABEL_INFO = {
  Innervisions: {
    tag: "Berlin · founded 2005",
    founders: "Dixon (Steffen Berkhahn), Frank Wiedemann & Kristian Beyer (Âme)",
    story:
      "Kristian ran a record store in Karlsruhe called Plattentasche — that's where he met Frank and they started making music together as Âme. Dixon connected with them over shared taste, Kristian shut the store and moved to Berlin, and Innervisions was born as a Sonar Kollektiv sub-label before going fully independent in 2006.",
    sound:
      "Deep, spellbinding house and techno, released in small, deliberate batches — every record wrapped in art-directed packaging. Mixmag credits the label with \"an astounding influence on the global house scene.\"",
  },
  Keinemusik: {
    tag: "Berlin · founded 2009",
    founders: "Adam Port, &ME & Rampa, later joined by Reznik",
    story:
      "&ME and Rampa met interning at a Berlin production studio, pulling night shifts on borrowed gear. Forming a collective was Rampa's idea — the group came together properly in 2009 once Reznik relocated to Berlin. The name \"Keinemusik\" translates to \"no music,\" a wink at refusing to sit inside one genre.",
    sound:
      "The self-described \"Keinemusik wave\" — house, disco, techno, hip-hop and Afrobeats folded into something constantly shifting but rooted in an Afrocentric, progressive sensibility. It's since filled Ibiza's Circo Loco and turned up on the Grand Theft Auto radio.",
  },
};

function fmtCompact(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

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

function RosterBars({ labelName, highlight }) {
  const rows = TOP_ARTISTS.filter((a) => a.label === labelName).sort((a, b) => b.release_count - a.release_count);
  const max = rows[0]?.release_count || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.artist} className="flex items-center gap-2 text-xs">
          <div className={`w-32 truncate ${r.artist === highlight ? "text-zinc-100 font-medium" : "text-zinc-400"}`}>
            {r.artist}
            {r.artist === highlight && <span className="text-teal-400 ml-1">●</span>}
          </div>
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

function LabelCard({ name }) {
  const info = LABEL_INFO[name];
  const color = LABEL_COLOR[name];
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{info.tag}</div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">{name}</h3>
      <div className="text-xs text-zinc-400 mb-3">{info.founders}</div>
      <p className="text-sm text-zinc-400 leading-relaxed mb-3">{info.story}</p>
      <div className="rounded-md bg-zinc-950/60 border border-zinc-800 p-3">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Sound</div>
        <p className="text-xs text-zinc-300 leading-relaxed">{info.sound}</p>
      </div>
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

      <div className="flex gap-1 px-6 pt-4 border-b border-zinc-800 overflow-x-auto">
        {["overview", "roster", "labels", "engagement", "methodology"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm rounded-t-md whitespace-nowrap ${tab === t ? "bg-zinc-900 text-zinc-100 border border-zinc-800 border-b-0" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {t === "labels" ? "The Labels" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUMMARY.map((s) => (
              <Stat key={s.label} label={s.label} value={s.total_releases} sub={`${s.first_year}–${s.latest_year} · ${s.avg_releases_per_year}/yr avg`} />
            ))}
            <Stat label="Distinct artists" value="71 / 30" sub="Innervisions / Keinemusik" />
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
            pattern. The one genuinely interesting cross-label find — <strong>Rampa</strong>, a Keinemusik co-founder,
            also releasing directly on Innervisions — gets its own writeup, with the label backstories, on{" "}
            <button onClick={() => setTab("labels")} className="text-zinc-200 underline decoration-zinc-600 underline-offset-2 hover:text-white">
              The Labels tab
            </button>.
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
              <RosterBars labelName="Innervisions" highlight="Jimi Jules" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Keinemusik</div>
              <RosterBars labelName="Keinemusik" highlight="Rampa" />
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            <span className="text-teal-400">●</span> marks an artist called out on The Labels tab — Jimi Jules on Innervisions, and Rampa on Keinemusik (and, as it turns out, on Innervisions too). Note
            <strong className="text-zinc-400"> &ME</strong> now leads Keinemusik's roster (10 releases) after merging a casing split in the source
            data — see the Methodology tab.
          </div>
        </div>
      )}

      {tab === "labels" && (
        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-5">
            <LabelCard name="Innervisions" />
            <LabelCard name="Keinemusik" />
          </div>

          <div className="rounded-lg border border-teal-900/50 bg-gradient-to-b from-teal-950/20 to-zinc-900/40 p-5">
            <div className="text-xs uppercase tracking-wide text-teal-400 font-medium mb-2">Found in the data, not assumed going in</div>
            <h3 className="text-base font-semibold text-zinc-100 mb-2">Rampa is the bridge between both labels</h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">
              Rampa — Keinemusik co-founder and the label's second most prolific artist with 9 releases — also put out
              two EPs directly on Innervisions: <em>Hall Of Violence EP</em> (2017) and <em>They Will EP</em> (2019). Two
              Berlin labels with almost no roster overlap, and the one artist who bridges them turns out to be a
              co-founder of one of them.
            </p>
            <div className="flex items-center gap-2 text-xs mb-4">
              <span className="px-2.5 py-1 rounded-full font-medium" style={{ background: "#f59e0b22", color: "#f59e0b" }}>Keinemusik · co-founder</span>
              <span className="text-zinc-500">— released on →</span>
              <span className="px-2.5 py-1 rounded-full font-medium" style={{ background: "#3b82f622", color: "#3b82f6" }}>Innervisions · 2017 &amp; 2019</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed border-l-2 border-teal-700/60 pl-3">
              I'm a DJ myself, and Rampa and Jimi Jules (Innervisions, 4 releases) are two of the artists I most admire —
              finding this connection in a self-run SQL query, rather than already knowing it, was the best part of
              building this project.
            </p>
          </div>
        </div>
      )}

      {tab === "engagement" && (
        <div className="p-6 space-y-8">
          <p className="text-sm text-zinc-400 leading-relaxed">
            Two different kinds of data below — kept visually distinct on purpose. <span className="text-zinc-200 font-medium">Collector demand</span> is
            real: Discogs' public have/want counts, fetched live per release. <span className="text-zinc-200 font-medium">Estimated live revenue</span> is
            a modeled number — no public API for touring earnings exists (Bandsintown returns 403 for an unregistered app, Songkick's API is
            partner-only) — built from real release rank plus stated, documented touring-tier assumptions. See the Methodology tab for the full breakdown.
          </p>

          <div>
            <div className="text-sm font-medium mb-2 text-zinc-300">Collector demand index <span className="text-xs font-normal text-zinc-500">— real data, Discogs have + want per artist</span></div>
            <div className="grid md:grid-cols-2 gap-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Innervisions</div>
                <DemandBars labelName="Innervisions" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Keinemusik</div>
                <DemandBars labelName="Keinemusik" />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2 text-zinc-300 flex items-center gap-2">
              Estimated annual live-show revenue
              <span className="text-[10px] uppercase tracking-wide text-amber-500/90 border border-amber-800/50 rounded px-1.5 py-0.5">modeled estimate</span>
            </div>
            <div className="grid md:grid-cols-2 gap-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Innervisions</div>
                <EarningsBars labelName="Innervisions" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Keinemusik</div>
                <EarningsBars labelName="Keinemusik" />
              </div>
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              Touring tier assumed from real release rank: Tier A (rank 1–2) 45 shows/yr · $70 avg ticket · 1,800 avg capacity · 65% sellout;
              Tier B (rank 3–4) 30 shows/yr · $50 · 900 · 60%; Tier C (rank 5+) 15 shows/yr · $35 · 400 · 55%. Hatched fill marks every value on this chart as modeled, not measured.
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2 text-zinc-300">Does release frequency track with demand?</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <ImpactScatter />
              <div className="flex gap-4 mt-2">
                {Object.entries(LABEL_COLOR).map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{l}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-4 border-t border-dashed border-zinc-600" />trend (n=15)
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed mt-3">
              Across the 15 top artists sampled: release count vs. real collector demand, <span className="text-zinc-200">r = 0.603</span>; release
              count vs. modeled live revenue, <span className="text-zinc-200">r = 0.832</span>. Read both as directional at best —{" "}
              <strong>n=15 is far too small for a real correlation claim</strong>, and the second number is partly circular by construction: the
              revenue model assigns touring tier directly from release rank, so a strong correlation there is baked into the model's assumptions,
              not an independent finding. The demand correlation is the more honest of the two, since it comes from an independent real data source —
              and even that one is a loose pattern in 16 points, not a result.
            </p>
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
            <p className="mb-2">
              One real data quirk worth naming: Innervisions catalog number IV109 is dated 2026 in Discogs despite
              being numbered before IV110-IV116, which are dated 2024-2025 — catalog numbers on this label aren't
              strictly chronological, so year-based analysis (used here) is more reliable than reading the catalog
              number as a timeline.
            </p>
            <p>
              The source data originally split one Keinemusik artist across two casing variants —{" "}
              <strong>&amp;ME</strong> and <strong>&amp;Me</strong> — even within the same catalog number: different
              Discogs pressings of KM028, KM037, and KM046 each used a different casing for the identical release.
              Caught and merged into one canonical <strong>&amp;ME</strong> (10 releases combined) in the source CSV,
              which is what surfaces &amp;ME — not Rampa — as Keinemusik's most prolific artist. See "Extension
              limitations" below for the query fix this merge required.
            </p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">The Labels tab</div>
            <p>
              Founding story, founders, and sound description for each label are the one part of this project that
              isn't derived from the SQL — sourced from the labels' own About pages and press coverage (Mixmag,
              Forbes, Crack Magazine, Wikipedia) specifically so that tab reads as an actual profile of the labels,
              not the same release numbers restated in prose.
            </p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Extension: collector demand (real data)</div>
            <p>
              Added the question "who's actually in demand" using the closest real signal available without a Spotify developer
              key: Discogs' public <code className="text-zinc-500">community.have</code> / <code className="text-zinc-500">community.want</code> counts,
              fetched live per release for each label's top 8 artists (~87 individual release lookups). This is a collector-demand
              signal — how many Discogs users own or want a copy — not a streaming-listen count, and it's labeled that way
              everywhere it appears. No platform publishes real per-track listen counts for arbitrary artists without paid API access.
            </p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Extension: live-show revenue (modeled estimate, not real data)</div>
            <p className="mb-2">
              Checked two real touring-data APIs before deciding how to handle "who earns more from live shows": Bandsintown's API
              returns a 403 (unauthorized) for an unregistered app id — partner-only, not self-serve — and Songkick closed public
              API signups years ago. There is no free, legitimate source for real per-artist touring earnings, so rather than
              fabricate numbers or drop the question, this builds a transparent model instead:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mb-2">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-1 pr-3">Tier</th>
                    <th className="text-left py-1 pr-3">Release rank</th>
                    <th className="text-right py-1 pr-3">Shows/yr</th>
                    <th className="text-right py-1 pr-3">Avg ticket</th>
                    <th className="text-right py-1 pr-3">Avg capacity</th>
                    <th className="text-right py-1">Sellout</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  {Object.entries(TOURING_TIERS).map(([name, t]) => (
                    <tr key={name} className="border-b border-zinc-900">
                      <td className="py-1 pr-3 text-zinc-300">{name}</td>
                      <td className="py-1 pr-3">{name === "C" ? "5+" : `1–${t.rnk_max}`}</td>
                      <td className="py-1 pr-3 text-right">{t.shows_per_year}</td>
                      <td className="py-1 pr-3 text-right">${t.avg_ticket_usd}</td>
                      <td className="py-1 pr-3 text-right">{t.avg_capacity.toLocaleString()}</td>
                      <td className="py-1 text-right">{Math.round(t.sellout_rate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Every artist is placed into a tier by their real release rank on that label (from the RANK() window function above),
              and estimated revenue = shows/yr × ticket × capacity × sellout. This is an illustrative model built on stated
              assumptions, not a claim about real income — shown with hatched fill and an "modeled estimate" badge everywhere
              it appears, and structured so real numbers could replace it if touring-data access becomes available.
            </p>
          </div>
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="text-amber-400 font-medium mb-1">Extension limitations</div>
            <p className="mb-2">
              <strong>Sample size:</strong> the demand/earnings analysis covers 15 top artists total (8 Innervisions, 7
              Keinemusik — Keinemusik dropped from 8 after merging the &amp;ME/&amp;Me split below) — nowhere near
              enough for the release-frequency correlations (r = 0.603 demand, r = 0.832 revenue) to mean anything statistically.
              Treated as directional patterns to investigate further, never as findings.
            </p>
            <p className="mb-2">
              <strong>The revenue correlation is partly circular:</strong> the touring-tier model assigns revenue tier directly
              from release rank, so release count correlating with modeled revenue is partly built into the model's own
              assumptions, not independent evidence that releasing more drives higher earnings.
            </p>
            <p>
              <strong>A real bug the data caught:</strong> Discogs' raw artist field disambiguates same-named artists with
              suffixes like "(3)" and trailing "*" (e.g. "Reznik (3) & Mikesh*" for the canonical "Reznik & Mikesh") — an
              early version of the matching logic missed this and silently returned a demand index of 0 for that artist, which
              would have read as "nobody wants this" rather than "the string didn't match." Fixed by normalizing those markers
              before matching; leaving this note because a caught data bug is more useful here than pretending it didn't happen.
            </p>
            <p className="mt-2">
              <strong>A second one, in the base release query:</strong> the same artist was split across two casings
              ("&amp;ME" / "&amp;Me") in Discogs' raw feed — merging them in the source CSV made &amp;ME Keinemusik's
              most prolific artist (10 releases) instead of Rampa (9), and dropped Keinemusik to 7 repeat artists.
              That second change exposed a latent bug in the original query: <code className="text-zinc-500">RANK() ...
              WHERE rnk &lt;= 8</code> ties every release_count=1 row for the same bottom rank, so a label with fewer
              than 8 repeat artists spills the filter into every one-off collab credit tied at rank 8. Fixed with a{" "}
              <code className="text-zinc-500">HAVING COUNT(*) &gt; 1</code> clause on the artist-count CTE, keeping this
              a "prolific artist" ranking rather than a tie-break lottery.
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

function DemandBars({ labelName }) {
  const rows = ENGAGEMENT.filter((a) => a.label === labelName).sort((a, b) => b.collector_demand_index - a.collector_demand_index);
  const max = rows[0]?.collector_demand_index || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.artist} className="flex items-center gap-2 text-xs">
          <div className="w-32 truncate text-zinc-400">{r.artist}</div>
          <div className="flex-1 bg-zinc-900 rounded h-4 overflow-hidden">
            <div
              className="h-4 rounded"
              style={{ width: `${(r.collector_demand_index / max) * 100}%`, background: LABEL_COLOR[labelName] }}
            />
          </div>
          <div className="w-14 text-right text-zinc-400">{r.collector_demand_index.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function EarningsBars({ labelName }) {
  const rows = EARNINGS_ESTIMATE.filter((a) => a.label === labelName).sort((a, b) => b.estimated_annual_live_revenue_usd - a.estimated_annual_live_revenue_usd);
  const max = rows[0]?.estimated_annual_live_revenue_usd || 1;
  const patternId = `hatch-${labelName}`;
  const width = 300, rowH = 22, labelW = 128, valueW = 44;
  const barMaxW = width - labelW - valueW;
  const height = rows.length * rowH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={`Estimated annual live-show revenue by artist, ${labelName} (modeled, not real earnings)`}>
      <defs>
        <pattern id={patternId} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={LABEL_COLOR[labelName]} />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#18181b" strokeWidth="2.5" />
        </pattern>
      </defs>
      {rows.map((r, i) => {
        const y = i * rowH;
        const barH = 14;
        const barY = y + (rowH - barH) / 2;
        const barW = Math.max((r.estimated_annual_live_revenue_usd / max) * barMaxW, 3);
        return (
          <g key={r.artist}>
            <text x={labelW - 8} y={y + rowH / 2 + 3} fontSize="10" fill="#a1a1aa" textAnchor="end">{r.artist}</text>
            <rect x={labelW} y={barY} width={barMaxW} height={barH} rx="3" fill="#18181b" />
            <rect x={labelW} y={barY} width={barW} height={barH} rx="3" fill={`url(#${patternId})`} />
            <text x={labelW + barMaxW + valueW - 2} y={y + rowH / 2 + 3} fontSize="10" fill="#a1a1aa" textAnchor="end">{fmtCompact(r.estimated_annual_live_revenue_usd)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ImpactScatter() {
  const w = 640, h = 300, pad = 48;
  const rows = RELEASE_IMPACT.rows;
  const xMax = Math.max(...rows.map((r) => r.release_count)) + 1;
  const yMax = Math.max(...rows.map((r) => r.collector_demand_index)) * 1.08;
  const x = (v) => pad + (v / xMax) * (w - pad * 1.5);
  const y = (v) => h - pad - (v / yMax) * (h - pad * 1.6);

  const n = rows.length;
  const mx = rows.reduce((s, r) => s + r.release_count, 0) / n;
  const my = rows.reduce((s, r) => s + r.collector_demand_index, 0) / n;
  const slope = rows.reduce((s, r) => s + (r.release_count - mx) * (r.collector_demand_index - my), 0) /
    rows.reduce((s, r) => s + (r.release_count - mx) ** 2, 0);
  const intercept = my - slope * mx;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Release count vs. collector demand index, per top artist">
      <line x1={pad} y1={h - pad} x2={w - pad * 0.4} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      <line x1={pad} y1={pad * 0.4} x2={pad} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      {Array.from({ length: xMax }, (_, i) => i + 1).filter((v) => v % 2 === 0 || xMax < 8).map((v) => (
        <text key={v} x={x(v)} y={h - pad + 16} fill="#71717a" fontSize="9" textAnchor="middle">{v}</text>
      ))}
      {[0, yMax / 2, yMax].map((v) => (
        <text key={v} x={pad - 8} y={y(v) + 3} fill="#71717a" fontSize="9" textAnchor="end">{Math.round(v).toLocaleString()}</text>
      ))}
      <line x1={x(0)} y1={y(intercept)} x2={x(xMax)} y2={y(intercept + slope * xMax)} stroke="#52525b" strokeWidth="1.5" strokeDasharray="4 3" />
      {rows.map((r) => (
        <circle key={`${r.label}-${r.artist}`} cx={x(r.release_count)} cy={y(r.collector_demand_index)} r={5} fill={LABEL_COLOR[r.label]} fillOpacity="0.85" />
      ))}
      <text x={pad} y={16} fill="#a1a1aa" fontSize="10">collector demand index</text>
      <text x={w - pad * 0.4} y={h - pad + 34} fill="#71717a" fontSize="10" textAnchor="end">releases (per artist, on this label)</text>
    </svg>
  );
}

const ENGAGEMENT = [
  { label: "Innervisions", artist: "Âme", releases_sampled: 21, discogs_have_total: 9864, discogs_want_total: 6909, collector_demand_index: 16773 },
  { label: "Innervisions", artist: "Recondite", releases_sampled: 5, discogs_have_total: 2450, discogs_want_total: 2105, collector_demand_index: 4555 },
  { label: "Innervisions", artist: "Frankey & Sandrino", releases_sampled: 10, discogs_have_total: 2490, discogs_want_total: 1869, collector_demand_index: 4359 },
  { label: "Innervisions", artist: "Trikk", releases_sampled: 14, discogs_have_total: 965, discogs_want_total: 670, collector_demand_index: 1635 },
  { label: "Innervisions", artist: "Marcus Worgull", releases_sampled: 5, discogs_have_total: 1883, discogs_want_total: 791, collector_demand_index: 2674 },
  { label: "Innervisions", artist: "Toto Chiavetta", releases_sampled: 5, discogs_have_total: 510, discogs_want_total: 205, collector_demand_index: 715 },
  { label: "Innervisions", artist: "Jimi Jules", releases_sampled: 11, discogs_have_total: 566, discogs_want_total: 293, collector_demand_index: 859 },
  { label: "Innervisions", artist: "Tokyo Black Star", releases_sampled: 8, discogs_have_total: 2157, discogs_want_total: 788, collector_demand_index: 2945 },
  { label: "Keinemusik", artist: "&ME", releases_sampled: 10, discogs_have_total: 1871, discogs_want_total: 885, collector_demand_index: 2756 },
  { label: "Keinemusik", artist: "Rampa", releases_sampled: 10, discogs_have_total: 1888, discogs_want_total: 944, collector_demand_index: 2832 },
  { label: "Keinemusik", artist: "Adam Port", releases_sampled: 8, discogs_have_total: 1177, discogs_want_total: 817, collector_demand_index: 1994 },
  { label: "Keinemusik", artist: "David Mayer", releases_sampled: 7, discogs_have_total: 691, discogs_want_total: 190, collector_demand_index: 881 },
  { label: "Keinemusik", artist: "NR&", releases_sampled: 2, discogs_have_total: 223, discogs_want_total: 75, collector_demand_index: 298 },
  { label: "Keinemusik", artist: "Keinemusik", releases_sampled: 5, discogs_have_total: 1419, discogs_want_total: 969, collector_demand_index: 2388 },
  { label: "Keinemusik", artist: "Reznik & Mikesh", releases_sampled: 3, discogs_have_total: 252, discogs_want_total: 71, collector_demand_index: 323 },
];

const TOURING_TIERS = {
  A: { rnk_max: 2, shows_per_year: 45, avg_ticket_usd: 70, avg_capacity: 1800, sellout_rate: 0.65 },
  B: { rnk_max: 4, shows_per_year: 30, avg_ticket_usd: 50, avg_capacity: 900, sellout_rate: 0.60 },
  C: { rnk_max: 99, shows_per_year: 15, avg_ticket_usd: 35, avg_capacity: 400, sellout_rate: 0.55 },
};

const EARNINGS_ESTIMATE = [
  { label: "Innervisions", artist: "Âme", release_rank: 1, release_count: 11, touring_tier: "A", estimated_annual_live_revenue_usd: 3685500 },
  { label: "Innervisions", artist: "Trikk", release_rank: 2, release_count: 6, touring_tier: "A", estimated_annual_live_revenue_usd: 3685500 },
  { label: "Innervisions", artist: "Frankey & Sandrino", release_rank: 3, release_count: 5, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Innervisions", artist: "Marcus Worgull", release_rank: 3, release_count: 5, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Innervisions", artist: "Tokyo Black Star", release_rank: 3, release_count: 5, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Innervisions", artist: "Toto Chiavetta", release_rank: 3, release_count: 5, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Innervisions", artist: "Jimi Jules", release_rank: 7, release_count: 4, touring_tier: "C", estimated_annual_live_revenue_usd: 115500 },
  { label: "Innervisions", artist: "Recondite", release_rank: 7, release_count: 4, touring_tier: "C", estimated_annual_live_revenue_usd: 115500 },
  { label: "Keinemusik", artist: "&ME", release_rank: 1, release_count: 10, touring_tier: "A", estimated_annual_live_revenue_usd: 3685500 },
  { label: "Keinemusik", artist: "Rampa", release_rank: 2, release_count: 9, touring_tier: "A", estimated_annual_live_revenue_usd: 3685500 },
  { label: "Keinemusik", artist: "Adam Port", release_rank: 3, release_count: 8, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Keinemusik", artist: "David Mayer", release_rank: 4, release_count: 6, touring_tier: "B", estimated_annual_live_revenue_usd: 810000 },
  { label: "Keinemusik", artist: "Keinemusik", release_rank: 5, release_count: 4, touring_tier: "C", estimated_annual_live_revenue_usd: 115500 },
  { label: "Keinemusik", artist: "Reznik & Mikesh", release_rank: 6, release_count: 3, touring_tier: "C", estimated_annual_live_revenue_usd: 115500 },
  { label: "Keinemusik", artist: "NR&", release_rank: 7, release_count: 2, touring_tier: "C", estimated_annual_live_revenue_usd: 115500 },
];

const RELEASE_IMPACT = {
  n: 15,
  pearson_release_count_vs_collector_demand: 0.603,
  pearson_release_count_vs_estimated_revenue: 0.832,
  rows: [
    { label: "Innervisions", artist: "Âme", release_count: 11, collector_demand_index: 16773, estimated_annual_live_revenue_usd: 3685500 },
    { label: "Innervisions", artist: "Trikk", release_count: 6, collector_demand_index: 1635, estimated_annual_live_revenue_usd: 3685500 },
    { label: "Innervisions", artist: "Frankey & Sandrino", release_count: 5, collector_demand_index: 4359, estimated_annual_live_revenue_usd: 810000 },
    { label: "Innervisions", artist: "Marcus Worgull", release_count: 5, collector_demand_index: 2674, estimated_annual_live_revenue_usd: 810000 },
    { label: "Innervisions", artist: "Tokyo Black Star", release_count: 5, collector_demand_index: 2945, estimated_annual_live_revenue_usd: 810000 },
    { label: "Innervisions", artist: "Toto Chiavetta", release_count: 5, collector_demand_index: 715, estimated_annual_live_revenue_usd: 810000 },
    { label: "Innervisions", artist: "Jimi Jules", release_count: 4, collector_demand_index: 859, estimated_annual_live_revenue_usd: 115500 },
    { label: "Innervisions", artist: "Recondite", release_count: 4, collector_demand_index: 4555, estimated_annual_live_revenue_usd: 115500 },
    { label: "Keinemusik", artist: "&ME", release_count: 10, collector_demand_index: 2756, estimated_annual_live_revenue_usd: 3685500 },
    { label: "Keinemusik", artist: "Rampa", release_count: 9, collector_demand_index: 2832, estimated_annual_live_revenue_usd: 3685500 },
    { label: "Keinemusik", artist: "Adam Port", release_count: 8, collector_demand_index: 1994, estimated_annual_live_revenue_usd: 810000 },
    { label: "Keinemusik", artist: "David Mayer", release_count: 6, collector_demand_index: 881, estimated_annual_live_revenue_usd: 810000 },
    { label: "Keinemusik", artist: "Keinemusik", release_count: 4, collector_demand_index: 2388, estimated_annual_live_revenue_usd: 115500 },
    { label: "Keinemusik", artist: "Reznik & Mikesh", release_count: 3, collector_demand_index: 323, estimated_annual_live_revenue_usd: 115500 },
    { label: "Keinemusik", artist: "NR&", release_count: 2, collector_demand_index: 298, estimated_annual_live_revenue_usd: 115500 },
  ],
};
