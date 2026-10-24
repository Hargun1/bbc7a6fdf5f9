import { mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = "https://data.elexon.co.uk/bmrs/api/v1/datasets/";
const manifest = [];
async function download(dataset, params) {
  const url = `${base}${dataset}/stream?${new URLSearchParams(params)}`;
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`${response.status}: ${url}`);
      const raw = await response.text();
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || !rows.length)
        throw new Error(`Empty/invalid response: ${url}`);
      manifest.push({
        url,
        rows: rows.length,
        sha256: createHash("sha256").update(raw).digest("hex"),
      });
      await writeFile(`data/raw/${dataset}-${manifest.length}.json`, raw);
      console.log(`${dataset}: ${rows.length} source rows`);
      return rows;
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** attempt));
    }
  }
  throw last;
}

await mkdir("data/raw", { recursive: true });
// An extra prior day supplies fallback forecasts for the first decision date.
const forecasts = await download("WINDFOR", {
  publishDateTimeFrom: "2025-12-31T00:00:00Z",
  publishDateTimeTo: "2026-02-01T00:00:00Z",
});
const actuals = await download("FUELHH", {
  settlementDateFrom: "2026-01-01",
  settlementDateTo: "2026-02-01",
});
function normalize(rows, actual = false) {
  const unique = new Map();
  for (const r of rows) {
    if (actual && r.fuelType !== "WIND") continue;
    if (
      typeof r.generation !== "number" ||
      !Number.isFinite(r.generation) ||
      r.generation < 0 ||
      !Number.isFinite(Date.parse(r.startTime)) ||
      !Number.isFinite(Date.parse(r.publishTime))
    )
      throw new Error("Invalid Elexon observation");
    const row = {
      startTime: new Date(r.startTime).toISOString(),
      publishTime: new Date(r.publishTime).toISOString(),
      generation: r.generation,
    };
    const key = `${row.startTime}|${row.publishTime}`;
    if (unique.has(key) && unique.get(key).generation !== row.generation)
      throw new Error(`Conflicting duplicate ${key}`);
    unique.set(key, row);
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.startTime.localeCompare(b.startTime) ||
      a.publishTime.localeCompare(b.publishTime),
  );
}
const snapshot = {
  meta: {
    retrievedAt: new Date().toISOString(),
    decisionFrom: "2026-01-01",
    decisionTo: "2026-01-31",
    source: "Elexon Insights",
    manifest,
  },
  forecasts: normalize(forecasts),
  actuals: normalize(actuals, true),
};
await writeFile("data/snapshot.json.tmp", JSON.stringify(snapshot));
await rename("data/snapshot.json.tmp", "data/snapshot.json");
console.log(
  `Saved ${snapshot.forecasts.length} forecasts and ${snapshot.actuals.length} WIND actuals.`,
);
