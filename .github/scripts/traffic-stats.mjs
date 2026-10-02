// Saves GitHub's repo traffic (kept by GitHub for 14 days only) and release
// download counts into CSV files, merging with what was saved before, so
// the history keeps growing. Run daily by .github/workflows/traffic-stats.yml
// inside a checkout of the `stats` branch. Node 20+, no dependencies.
//
// Env: GH_TOKEN (needs Administration: read for traffic), REPO ("owner/name").
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const { GH_TOKEN, REPO } = process.env;
const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};

const today = new Date().toISOString().slice(0, 10);

// CSV keyed by its first `keyCols` columns; new rows replace old ones with
// the same key (GitHub's latest numbers for a day win).
function merge(file, header, rows, keyCols) {
  const key = (r) => r.slice(0, keyCols).join("\u0000");
  const map = new Map();
  if (existsSync(file)) {
    readFileSync(file, "utf8").trim().split("\n").slice(1).filter(Boolean)
      .forEach((line) => { const r = line.split(","); map.set(key(r), r); });
  }
  rows.forEach((r) => map.set(key(r), r.map(String)));
  const sorted = [...map.values()].sort((a, b) => key(a).localeCompare(key(b)));
  writeFileSync(file, [header.join(","), ...sorted.map((r) => r.join(","))].join("\n") + "\n");
}

const clean = (s) => String(s).replace(/[,\n]/g, " ");
const day = (ts) => ts.slice(0, 10);

const views = await api("/traffic/views");
merge("views.csv", ["date", "views", "unique_visitors"], views.views.map((v) => [day(v.timestamp), v.count, v.uniques]), 1);

const clones = await api("/traffic/clones");
merge("clones.csv", ["date", "clones", "unique_cloners"], clones.clones.map((c) => [day(c.timestamp), c.count, c.uniques]), 1);

// Referrers and popular pages are 14-day totals, so they're saved per day seen.
const referrers = await api("/traffic/popular/referrers");
merge("referrers.csv", ["date", "referrer", "views", "unique_visitors"], referrers.map((r) => [today, clean(r.referrer), r.count, r.uniques]), 2);

const paths = await api("/traffic/popular/paths");
merge("pages.csv", ["date", "page", "views", "unique_visitors"], paths.map((p) => [today, clean(p.path), p.count, p.uniques]), 2);

// Downloads are running totals per release file; one row per day.
const releases = await api("/releases?per_page=100");
const downloads = releases.flatMap((r) => r.assets.map((a) => [today, clean(r.tag_name), clean(a.name), a.download_count]));
merge("downloads.csv", ["date", "release", "file", "downloads"], downloads, 3);

const total = downloads.reduce((s, d) => s + d[3], 0);
const last14 = views.views.reduce((s, v) => s + v.count, 0);
writeFileSync(
  "README.md",
  `# DigiLog stats\n\nUpdated ${today} by the "Save traffic stats" workflow.\n\n` +
    `- Views, last 14 days: **${last14}** (${views.uniques} unique visitors)\n` +
    `- APK downloads, all releases: **${total}**\n\n` +
    "Daily history: views.csv, clones.csv, downloads.csv; where visitors came from: referrers.csv, pages.csv.\n"
);
console.log(`views (14 days) ${last14}, unique ${views.uniques}, downloads ${total}`);
