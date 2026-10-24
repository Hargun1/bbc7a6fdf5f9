import express from "express";
import { resolve } from "node:path";
import { makeEngine, cutoffFor } from "./analytics.js";
import { getRepository } from "./repository.js";
const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
let enginePromise;
async function engine() {
  if (!enginePromise)
    enginePromise = getRepository()
      .then(({ snapshot, mode }) => ({
        analysis: makeEngine(snapshot),
        snapshot,
        mode,
      }))
      .catch((e) => {
        enginePromise = undefined;
        throw e;
      });
  return enginePromise;
}
app.get("/api/health", async (req, res, next) => {
  try {
    const { snapshot, mode } = await engine();
    res.json({
      status: "ok",
      storage: mode,
      retrievedAt: snapshot.meta.retrievedAt,
    });
  } catch (e) {
    next(e);
  }
});
function params(req) {
  const date = req.query.date ?? "2026-01-15",
    cutoff = req.query.cutoff ?? "09:00";
  if (typeof date !== "string" || typeof cutoff !== "string")
    throw new Error("Invalid parameters");
  cutoffFor(date, cutoff);
  return { date, cutoff };
}
app.get("/api/overview", async (req, res, next) => {
  try {
    const { date, cutoff } = params(req),
      { analysis, mode } = await engine();
    res.json({ ...analysis.overview(date, cutoff), storage: mode });
  } catch (e) {
    next(e);
  }
});
app.get("/api/accuracy", async (req, res, next) => {
  try {
    const { cutoff } = params(req),
      { analysis } = await engine();
    res.json(analysis.month(cutoff));
  } catch (e) {
    next(e);
  }
});
app.get("/api/revisions", async (req, res, next) => {
  try {
    const { date, cutoff } = params(req),
      hour = Number(req.query.hour ?? 12);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23)
      throw new Error("Hour must be 0–23");
    const { analysis } = await engine();
    res.json(analysis.revisions(date, cutoff, hour));
  } catch (e) {
    next(e);
  }
});
app.get("/api/export", async (req, res, next) => {
  try {
    const { date, cutoff } = params(req),
      { analysis, snapshot } = await engine();
    const rows =
      req.query.scope === "month"
        ? analysis.month(cutoff).rows
        : analysis.day(date, cutoff).rows;
    const fields = [
      "startTime",
      "forecast",
      "actual",
      "publishTime",
      "actualPublishTime",
      "leadHours",
      "error",
    ];
    const csv = [
      "decision_cutoff_uk,decision_date,delivery_start_utc,forecast_mw,actual_hourly_mean_mw,forecast_publish_utc,actual_publish_utc,lead_hours,error_forecast_minus_actual_mw,retrieved_at_utc",
      ...rows.map((r) =>
        [
          cutoff,
          r.decisionDate ?? date,
          ...fields.map((f) => r[f] ?? ""),
          snapshot.meta.retrievedAt,
        ].join(","),
      ),
    ].join("\r\n");
    res
      .attachment(
        `aeris-${req.query.scope === "month" ? "january" : date}-${cutoff.replace(":", "")}.csv`,
      )
      .type("text/csv")
      .send(csv);
  } catch (e) {
    next(e);
  }
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found" }),
);
app.use(express.static(resolve("dist")));
app.get("/{*path}", (req, res) => res.sendFile(resolve("dist/index.html")));
app.use((err, req, res, next) => {
  const bad = /Decision date|Cutoff must|Invalid parameters|Hour must/.test(
    err.message,
  );
  if (!bad) console.error(err.message);
  res
    .status(bad ? 400 : 503)
    .json({
      error: bad
        ? err.message
        : "Data unavailable. Check snapshot or MongoDB configuration.",
    });
});
export default app;
