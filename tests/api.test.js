import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import app from "../server/app.js";
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
test("health and day overview report authentic storage and coverage", async () => {
  const h = await fetch(`${base}/api/health`);
  assert.equal(h.status, 200);
  const health = await h.json();
  assert.equal(health.status, "ok");
  const o = await (
    await fetch(`${base}/api/overview?date=2026-01-15&cutoff=09:00`)
  ).json();
  assert.equal(o.deliveryDate, "2026-01-16");
  assert.equal(o.rows.length, 24);
  assert.ok(o.meta.forecastRows > 1000);
});
test("bad user parameters yield a structured 400", async () => {
  for (const query of [
    "date=2026-02-01",
    "date=invalid",
    "cutoff=24:00",
    "date=a&date=b",
  ]) {
    const r = await fetch(`${base}/api/overview?${query}`);
    assert.equal(r.status, 400);
    assert.ok((await r.json()).error);
  }
});
test("CSV month export has 744 delivery rows and audit fields", async () => {
  const r = await fetch(`${base}/api/export?scope=month`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  const lines = (await r.text()).split("\r\n");
  assert.equal(lines.length, 745);
  assert.match(lines[0], /forecast_publish_utc/);
  assert.match(lines.at(-1), /2026-02-01/);
  assert.equal(lines[1].split(",").length, lines[0].split(",").length);
});
test("revisions keep ineligible vintages visible for audit", async () => {
  const r = await (
    await fetch(`${base}/api/revisions?date=2026-01-15&hour=12`)
  ).json();
  assert.ok(r.some((x) => x.eligible));
  assert.ok(r.some((x) => !x.eligible));
  assert.equal((await fetch(`${base}/api/revisions?hour=24`)).status, 400);
});
test("unknown API is JSON 404", async () => {
  const r = await fetch(`${base}/api/not-real`);
  assert.equal(r.status, 404);
  assert.ok((await r.json()).error);
});
