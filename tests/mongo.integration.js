import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeEngine } from "../server/analytics.js";
// Against the running Compose stack (MongoDB is intentionally not host-exposed).
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3001";
let health;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const r = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      health = await r.json();
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
assert.ok(health, "Application did not become healthy");
assert.equal(
  health.storage,
  "MongoDB",
  "This check requires the real MongoDB-backed Compose stack",
);
const reference = JSON.parse(
  await readFile(new URL("../data/snapshot.json", import.meta.url)),
);
const expected = makeEngine(reference).month();
const monthly = await (await fetch(`${base}/api/accuracy`)).json();
assert.deepEqual(monthly.metrics, expected.metrics);
const day = await (await fetch(`${base}/api/overview?date=2026-01-15`)).json();
assert.equal(day.meta.forecastRows, reference.forecasts.length);
assert.equal(day.meta.actualRows, reference.actuals.length);
assert.equal(day.storage, "MongoDB");
assert.equal(day.rows.length, 24);
const html = await fetch(base);
assert.equal(html.status, 200);
assert.match(await html.text(), /Aeris/);
console.log(
  "PASS: Docker-hosted React/Express app reads the seeded MongoDB data with exact snapshot parity.",
);
