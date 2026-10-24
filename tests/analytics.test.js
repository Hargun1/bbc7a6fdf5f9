import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  makeEngine,
  metrics,
  quantile,
  cutoffFor,
} from "../server/analytics.js";
const row = (startTime, publishTime, generation) => ({
  startTime: new Date(startTime).toISOString(),
  publishTime: new Date(publishTime).toISOString(),
  generation,
});
function fixture() {
  return {
    meta: { retrievedAt: "2026-10-24T00:00:00Z" },
    forecasts: [
      row("2026-01-02T00:00Z", "2026-01-01T07:30Z", 100),
      row("2026-01-02T00:00Z", "2026-01-01T09:00Z", 110),
      row("2026-01-02T00:00Z", "2026-01-01T09:01Z", 9999),
    ],
    actuals: [
      row("2026-01-02T00:00Z", "2026-01-02T00:30Z", 80),
      row("2026-01-02T00:30Z", "2026-01-02T01:00Z", 100),
    ],
  };
}
test("cutoff is inclusive and excludes later forecasts", () => {
  const d = makeEngine(fixture()).day("2026-01-01");
  assert.equal(d.rows[0].forecast, 110);
  assert.equal(d.rows[0].publishTime, "2026-01-01T09:00:00.000Z");
  assert.equal(d.rows[1].forecast, null);
});
test("actuals align by mean of two half-hours, not sum", () => {
  const r = makeEngine(fixture()).day("2026-01-01").rows[0];
  assert.equal(r.actual, 90);
  assert.equal(r.error, 20);
});
test("a missing half-hour does not become zero or a complete actual", () => {
  const f = fixture();
  f.actuals.pop();
  assert.equal(makeEngine(f).day("2026-01-01").rows[0].actual, null);
  assert.equal(metrics(makeEngine(f).day("2026-01-01").rows).n, 0);
});
test("zero generation is a valid forecast and actual", () => {
  const f = fixture();
  f.forecasts.forEach((r) => (r.generation = 0));
  f.actuals.forEach((r) => (r.generation = 0));
  const d = makeEngine(f).day("2026-01-01");
  assert.equal(d.rows[0].forecast, 0);
  assert.equal(metrics(d.rows).mae, 0);
  assert.equal(metrics(d.rows).wape, null);
});
test("metrics use paired hours, define bias as forecast minus actual", () => {
  const m = metrics([
    { forecast: 110, actual: 100 },
    { forecast: 80, actual: 100 },
    { forecast: null, actual: 500 },
  ]);
  assert.equal(m.n, 2);
  assert.equal(m.mae, 15);
  assert.equal(m.bias, -5);
  assert.equal(m.rmse, Math.sqrt(250));
  assert.equal(m.wape, 15);
});
test("empty metrics and linear percentile are explicit", () => {
  assert.equal(metrics([]).mae, null);
  assert.equal(quantile([], 0.9), null);
  assert.equal(quantile([0, 10], 0.9), 9);
});
test("January means decision dates, including delivery on February 1", () => {
  assert.equal(
    makeEngine(fixture()).day("2026-01-31").deliveryDate,
    "2026-02-01",
  );
  assert.equal(makeEngine(fixture()).month().expected, 744);
});
test("input validation rejects malformed dates and cutoffs", () => {
  for (const d of ["2026-02-01", "2026-01-32", "2026-01-00", "bad"])
    assert.throws(() => cutoffFor(d));
  for (const t of ["24:00", "09:60", "9:00", null])
    assert.throws(() => cutoffFor("2026-01-01", t));
});
test("partial day never reports full forecast energy", () => {
  assert.equal(
    makeEngine(fixture()).overview("2026-01-01").summary.energy,
    null,
  );
});
test("historical risk requires 48 paired hours and cannot use future actuals", () => {
  const f = { meta: {}, forecasts: [], actuals: [] };
  for (const day of ["02", "03"])
    for (let h = 0; h < 24; h++) {
      const start = `2026-01-${day}T${String(h).padStart(2, "0")}:00:00Z`;
      const publish = `2026-01-${String(Number(day) - 1).padStart(2, "0")}T07:30:00Z`;
      f.forecasts.push(row(start, publish, 120));
      f.actuals.push(
        row(start, `2026-01-${day}T23:59:00Z`, 100),
        row(
          new Date(Date.parse(start) + 1800000),
          `2026-01-${day}T23:59:00Z`,
          100,
        ),
      );
    }
  const e = makeEngine(f);
  assert.equal(e.overview("2026-01-03").risk.buffer, null);
  assert.equal(e.overview("2026-01-04").risk.buffer, 20);
  f.actuals[0].publishTime = "2026-01-05T00:00:00.000Z";
  assert.equal(makeEngine(f).overview("2026-01-04").risk.buffer, null);
});
test("snapshot invariants: selection is causal, energy has correct units, history precedes decision", async () => {
  const s = JSON.parse(
    await readFile(new URL("../data/snapshot.json", import.meta.url)),
  );
  const e = makeEngine(s);
  for (const time of ["09:00", "09:20", "09:50", "15:00"]) {
    const m = e.month(time);
    assert.equal(m.days.length, 31);
    assert.equal(m.rows.length, 744);
    for (const r of m.rows)
      if (r.forecast !== null)
        assert.ok(r.publishTime <= cutoffFor(r.decisionDate, time));
    for (const d of ["2026-01-01", "2026-01-15", "2026-01-31"]) {
      const o = e.overview(d, time);
      if (o.risk.to) assert.ok(o.risk.to < d);
      if (o.summary.forecastHours === 24)
        assert.equal(
          o.summary.energy,
          o.rows.reduce((s, r) => s + r.forecast, 0),
        );
    }
  }
  assert.equal(e.overview("2026-01-01").risk.buffer, null);
});
