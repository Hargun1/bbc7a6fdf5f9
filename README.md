# Aeris — React + Python wind intelligence

A January 2026 pilot for a Great Britain day-ahead electricity procurement desk. Replay the wind forecast available at a decision cutoff and evaluate that same forecast against Elexon actuals.

**Stack:** React 19, Vite and Recharts frontend; Python 3.13 and FastAPI backend; MongoDB via PyMongo (Atlas in production, MongoDB 7 in Docker). All analytics, ingestion, seeding, exports, and HTTP endpoints are Python. Node.js is used only for frontend build tooling.

**AI disclosure:** OpenAI Codex assisted with domain research, visual design, implementation, documentation, and tests. Numerical data comes from the two specified Elexon APIs, never synthetic generation data.

**Visual reference:** [GridBricks by REint AI](https://reint.ai/): warm neutral surfaces, charcoal text, Inter typography, editorial serif headlines, green accents, and restrained analytical interfaces. Aeris is an independent assessment pilot, not an official GridBricks product or a copy of its private portal.

## Delivery

- Public repository: https://github.com/Hargun1/bbc7a6fdf5f9 (anonymous repository name).
- Live app: **https://aeris-bbc7a6fdf5f9.vercel.app** — React frontend, Python/FastAPI backend, and **MongoDB Atlas** storage, publicly accessible without Vercel login.
- Release 2.1: **55 Python tests and the React build passed**, with staged and public Decision Lab/brief parity checks. [Docker/MongoDB CI passed](https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40118053377): container startup, repeat seed, MongoDB-backed metrics, Decision Lab replay, brief parity, and frontend response.
- Video: use the [simple recording script](docs/demo-script-simple.md), with plain-language narration and click instructions. It targets 9:20, with customer and technical parts under five minutes each. The earlier `docs/demo-script.md` remains available for reference.
- Submission form: pending; the required video must exist first.

## Start locally

For a detailed personal learning script, read [Aeris explained](docs/project-explained.md): domain basics, worked calculations, every screen, the code tour, MongoDB, Docker, Vercel, and reviewer Q&A. The separate [recording script](docs/demo-script.md) is timed for the required under-ten-minute video.

Prerequisites: Python 3.13, Node.js 22+, npm. The checked-in real Elexon snapshot supports startup without an API key or database account.

```sh
python -m pip install -r requirements-dev.txt
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to FastAPI on port 3001. Interactive Python API documentation is at http://127.0.0.1:3001/api/docs.

Production locally:

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. Uvicorn serves the Python API and compiled React files.

## Docker: React + Python + MongoDB

Requires Docker Engine/Desktop with Linux containers and Compose v2.

```sh
docker compose up --build
```

Open http://localhost:3001. See [the Docker/MongoDB runbook](docs/docker-mongodb.md) for background startup, verification, database counts, and stop/start commands. Compose uses the fixed project name `aeris`, starts MongoDB 7, waits for health, seeds with an idempotent Python service, then starts the application. The multi-stage image builds React with Node and uses a non-root Python production runtime. MongoDB is not exposed on a host port and uses a named volume.

```sh
docker compose down
```

The volume is retained. For an external database, set `MONGODB_URI` and run `python -m scripts.seed`. Restart the API after seeding: this fixed January pilot caches its data in process.

Without a URI, the API/UI report **Bundled Elexon snapshot**. Configured database failures return 503 rather than silently changing storage. `.env.example` lists settings; local commands do not auto-load `.env` files. Set variables in the shell, Compose, or Vercel.

## Product workflow

- **Day-ahead desk:** decision date, D+1 delivery, cutoff, wind profile, energy, peak, forecast age, historical shortfall scenario, and hourly audit. Actuals stay hidden until revealed as hindsight.
- **Forecast accuracy:** MAE/RMSE/bias/WAPE, P90 absolute error, daily scorecards, daily errors, hourly bias, and paired coverage. Change cutoff to compare information policies.
- **Decision Lab:** compare earlier/later forecast vintages, evaluate cutoff policies on a common cohort, replay P80/P90/P95 buffers chronologically, inspect a 31×24 signed-error atlas, and download an as-of decision brief. See `docs/decision-lab.md` for formulas, caveats, and a demonstration route.
- **Data & provenance:** source counts, actual storage mode, requests/hashes, and all retained forecast vintages, including those excluded by cutoff.
- **Methodology:** selection, aggregation, units, assumptions, and pilot boundaries.
- **CSV:** daily/monthly export includes cutoff, decision date, target time, forecast and actual publication times, lead time, error, and retrieval timestamp. Actual columns are retrospective even when hidden in the chart.

## Analysis contract

1. **Window:** decision dates 1–31 January 2026, hence delivery 2 January–1 February. January 1 delivery requires a December decision and is not evaluated. Boundary records are retained, but no pre-January calibration errors are used.
2. **Time:** UTC source timestamps, Europe/London UI labels. This window is entirely GMT; validation deliberately limits the app to January 2026.
3. **Cutoff:** 09:00 GMT is an explicit desk assumption, not a universal auction deadline. Alternatives 09:20, 09:50, and 15:00 are sensitivity scenarios. Confirm venue and submission lead time with the client.
4. **Vintage:** for each target hour, select the latest WINDFOR record with `publishTime <= cutoff`. Never use the latest forecast retrieved today. Different target hours may legitimately have different publication times.
5. **Alignment:** retrieved WINDFOR is hourly. FUELHH is half-hourly, strictly filtered to WIND. Actual hourly MW is the mean of both half-hours; both are required. No interpolation or forward filling.
6. **Units/gaps:** MW is power; hourly MW times one hour is MWh. Energy is only shown for a complete day. Null stays null, zero is valid, and only paired hours enter metrics. Conflicting identical source keys abort ingestion.
7. **Revisions:** actuals use the latest retrieved revision and carry the latest contributing publication timestamp. This historical extraction is not an independent app-observed January archive. Source publication is an availability proxy; production replay needs observed-at times and revision history.
8. **Error:** `forecast - actual`; positive means overforecast wind. MAE measures absolute miss, RMSE emphasises large misses, bias measures direction. WAPE is `100 * sum(abs(error)) / sum(abs(actual))`, returning null on a zero denominator. Percentiles interpolate linearly.
9. **Risk scenario:** with at least 48 pairs, buffer is `max(0, P90(signed errors))` from completed earlier delivery days, with actual publication no later than cutoff. Lower scenario is `max(0, forecast - buffer)`. This pooled empirical scenario is not a calibrated prediction interval or guarantee. Early January correctly lacks history.
10. **Scope:** operationally metered Elexon wind is not all UK wind/renewables or a utility portfolio. No demand, prices, contracts, allocation, or other generation is ingested. These two series cannot determine a purchase volume alone.

### Reproducible 09:00 GMT findings

| Metric | Result |
| --- | ---: |
| Matched pairs | 744 / 744 |
| MAE | 2,038.91 MW |
| RMSE | 2,504.76 MW |
| Bias | +1,747.89 MW |
| WAPE | 18.07% |
| P90 absolute error | 4,097.90 MW |

Reproduce with `python -m scripts.report`. Positive bias is descriptive evidence for this sample, not a stable future hedge. On the 15 January decision: publication 07:30 GMT, mean 7.93 GW, energy 190.33 GWh, and historical buffer 4.38 GW from 312 earlier pairs.

## Data and refresh

Only [WINDFOR](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream) and [FUELHH](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to WIND, supply numbers. [Elexon's guidance](https://bmrs.elexon.co.uk/wind-generation) explains resolution and metering coverage.

`data/snapshot.json` has 18,688 normalized forecast records and 1,536 WIND half-hours, retrieved on 24 October 2026. Exact UTC extraction time, requests, pre-filter counts, and raw-response SHA-256 hashes are in metadata.

```sh
python -m scripts.ingest
```

Ingestion has timeouts/retries, validates/deduplicates, saves ignored raw responses, and atomically replaces the snapshot only after success. Reseed/restart MongoDB, or rebuild/redeploy the bundled snapshot after refreshing.

Contains BMRS data © Elexon Limited copyright and database right 2026. Review [Elexon's terms](https://bmrs.elexon.co.uk/) before wider redistribution.

## Files and directories

| Path | Purpose |
| --- | --- |
| `client/src/main.jsx`, `styles.css` | React views, charts, controls, responsive visual system |
| `client/src/DecisionLab.jsx`, `decision-lab.css` | Revision comparison, risk replay, keyboard-accessible error atlas, and brief download |
| `server/analytics.py` | Pure Python vintage selection, alignment, metrics, causal history |
| `server/decision_tools.py`, `server/brief.py` | Fair policy comparisons, walk-forward buffer validation, and portable as-of reports |
| `server/repository.py` | Snapshot/MongoDB adapter, initialization lock, cache |
| `server/app.py` | FastAPI routes, validation, CSV, static hosting, API docs |
| `api/index.py` | Vercel ASGI entrypoint for the same app |
| `scripts/ingest.py` | Acquisition, validation, hashing, atomic replacement |
| `scripts/seed.py` | Idempotent PyMongo indexes and keyed upserts |
| `scripts/report.py` | Reproduce pilot statistics |
| `scripts/verify_deployment.py` | Check deployed Python API, data, storage, and frontend |
| `data/snapshot.json` | Real Elexon records and provenance |
| `tests/test_analytics.py`, `test_api.py` | Core analytic, ingestion, and API tests |
| `tests/test_decision_tools.py` | Temporal report isolation, fair cohorts, buffer tradeoffs, and feature API checks |
| `docs/` | Architecture, recording script, publication/access verification |
| `requirements*.txt`, `pyproject.toml`, `.python-version` | Python dependencies and configuration |
| `package*.json`, `vite.config.js` | Frontend dependencies and development/build commands |
| `Dockerfile`, `compose.yaml` | Non-root Python runtime and MongoDB orchestration |
| `vercel.json` | React static build plus Python API routing |
| `.github/workflows/check.yml` | Tests, build, Docker startup, repeat seed, MongoDB parity |

## API and checks

GET `/api/health`, `/api/overview?date=2026-01-15&cutoff=09:00`, `/api/accuracy?cutoff=09:00`, `/api/revisions?hour=12`, `/api/export?scope=month`. Interactive docs: `/api/docs`. Invalid inputs/duplicates return JSON 400; unavailable data returns 503. No public mutation/trading endpoints.

Decision Lab: `/api/lab?date=2026-01-15&cutoff=09:00&earlier=07:00&confidence=90`. Confidence accepts 80/90/95; the earlier cutoff must be strictly before the selected cutoff. Brief: `/api/brief` downloads printable HTML; `?format=json` returns its reproducible as-of record. Both endpoints accept the same decision/policy settings.

```sh
npm run check
```

Runs 55 Python tests and the React production build. Checks cover causal selection, alignment, gaps, zeros, metric signs/units, date boundaries, history, real-data invariants, ingestion conflicts, validation, revisions, CSV traceability, common-cohort policy comparisons, chronological buffer evaluation, and isolation of the brief from future actual readings. Migration additionally compared all monthly outputs and 124 profiles across four cutoffs against the former implementation; all matched within floating-point tolerance.

With the real Compose stack running, `npm run test:mongo` checks Python backend identity, MongoDB storage, record counts, numerical parity, and React HTML. CI also repeats seeding. See `docs/submission.md` for actual completed checks.

## Vercel

Project: `hargun1s-projects/aeris-bbc7a6fdf5f9`. Vercel serves `dist` and routes `/api/*` to the FastAPI ASGI app in `api/index.py`. No Express/Node backend remains.

The public pilot reads the real Elexon data from **MongoDB Atlas**. `MONGODB_URI` is stored as a hidden Vercel production Secret. Atlas was seeded twice with unchanged counts: 18,688 forecasts, 1,536 actuals, and one metadata document; source-key indexes are unique. The staged and public APIs match the reference snapshot for metrics, Decision Lab replay, and brief identity. Local startup without a URI still supports the bundled snapshot. Never commit credentials or Vercel-generated environment files.

The public deployment was verified without authentication: Python/MongoDB health identity, 744-pair accuracy results, daily profiles, revision audit, 744-row CSV export, API documentation, and invalid-date HTTP 400 responses. The production hostname above is public; Vercel's deployment-specific/team-preview hostnames retain their normal access protection. GitHub is connected for future deployments from this repository.

Record/upload the under-ten-minute video, then test the exact app, repository, and video URLs in incognito before submitting the assignment form. Recording and submission remain pending.
