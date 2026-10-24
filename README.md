# Aeris — day-ahead wind intelligence

A January 2026 pilot for a Great Britain electricity procurement desk. Replay the wind forecast available at a decision cutoff, then evaluate that same forecast against Elexon actuals.

**Stack:** MongoDB, Express 5, React 19, Node.js 22+. The requester subsequently preferred MERN over the assignment's original Python backend requirement; the implementation follows that updated instruction. There is no Python runtime dependency.

**AI disclosure:** OpenAI Codex was used for domain research, design, implementation, documentation, and test development. Numerical data comes from the specified Elexon APIs, not generated or simulated data.

## Delivery status

| Deliverable | Status |
| --- | --- |
| Working application | Implemented; local development URL: http://127.0.0.1:5173 |
| Public Vercel/Heroku URL | Pending authenticated deployment; no public URL has been created |
| Public GitHub repository | [Hargun1/bbc7a6fdf5f9](https://github.com/Hargun1/bbc7a6fdf5f9) · anonymous repository name |
| Unlisted YouTube demo | Requester will record/upload; timed script in `docs/demo-script.md` |
| Submission form | Not submitted; do not submit until the video and all public links exist |

The app and video links remain pending. Localhost is not a submission URL. No hosted deployment or recording is claimed here.

## Run locally

Prerequisites: Node.js 22+ and npm. No API key is needed. The checked-in Elexon snapshot makes the pilot reproducible and independent of upstream availability.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies `/api` to Express on port 3001.

For a production build:

```sh
npm run build
npm start
```

Open http://127.0.0.1:3001. Express serves the compiled React app and API from one origin.

With no `MONGODB_URI`, the API explicitly reports **Bundled Elexon snapshot** storage. This is the zero-setup reviewer mode, not a pretend database connection. When `MONGODB_URI` is configured, the API requires MongoDB and returns a data-unavailable error on failure; it does not silently switch storage.

## Run the full MERN stack with Docker

Prerequisites: Docker Engine/Desktop running with Linux containers, and Docker Compose v2.

```sh
docker compose up --build
```

Open http://localhost:3001. Compose starts MongoDB 7, waits for its health check, seeds the real snapshot using an idempotent one-shot service, then starts Express/React. MongoDB uses a named volume and is not exposed on a host port. The application runs as a non-root user.

```sh
docker compose down
```

The database volume is retained. To run MongoDB separately, set `MONGODB_URI` in the shell, then `npm run seed` and `npm start`. Example in PowerShell:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/aeris'
npm run seed
npm start
```

`.env.example` documents supported settings. `.env` files are not auto-loaded: set environment variables in your shell, Compose, or hosting provider. Restart the API after reseeding: the small, immutable pilot dataset is cached in process.

## What the product does

- **Day-ahead desk:** choose a January decision date and cutoff; view the D+1 wind profile, energy, peak, forecast age, coverage, empirical shortfall scenario, and hourly publication audit. Actuals remain hidden until explicitly revealed as hindsight.
- **Forecast accuracy:** 31 decision-day scorecards, daily MAE, hourly bias, MAE/RMSE/bias/WAPE, P90 absolute error, and paired-data coverage. Change the cutoff to compare decision policies.
- **Data & provenance:** actual storage mode, source counts and request URLs, raw-response SHA-256 checksums, and all retained forecast vintages for a selected target hour, including records excluded by the cutoff.
- **Methodology:** temporal selection, units, aggregation, risk assumptions, and pilot limitations.
- **CSV:** export one delivery day or all 744 evaluation hours with forecast/actual publication times, selected cutoff, lead time, error, and retrieval timestamp. Actual columns are retrospective even when the chart's hindsight toggle is off.

## Analysis contract

1. **Window:** January means **decision dates 1–31 January 2026**, hence **delivery dates 2 January–1 February 2026**. January 1 delivery would require a December decision and is outside the evaluation. January 1 actuals and December 31 forecasts are retained as boundary context, not used as pre-January calibration history.
2. **Time:** all timestamps are parsed in UTC; the UI labels Europe/London. The evaluated dates are GMT, so no daylight-saving transition occurs. This implementation deliberately validates only this assignment window; it is not a general DST calendar engine.
3. **Cutoff:** default 09:00 GMT is a pilot desk assumption, not a claim about a universal UK auction deadline. Alternatives are 09:20, 09:50, and 15:00 for sensitivity analysis. Confirm venue and an operational submission buffer with the client. The selector is inclusive: `publishTime <= cutoff`.
4. **Forecast vintage:** for **each target hour**, select the latest eligible WINDFOR publication, rather than the latest forecast retrieved today. Different target hours may therefore legitimately have different publication times.
5. **Resolution:** actual retrieved WINDFOR records are hourly. FUELHH is half-hourly, filtered strictly to `fuelType === 'WIND'`. Align to forecast-native hours using the mean of the two corresponding half-hour actual MW readings. No linear interpolation or forward filling is introduced.
6. **Units:** power is MW (charts also show GW). One hourly MW forecast × 1 hour is MWh; summing a full 24 hours gives daily energy. Partial-day energy is not presented as a full-day total.
7. **Missing data:** null remains null; zero is valid. Both half-hours are required for an actual hour. Metrics include paired hours only, with coverage stated explicitly. Same target/publication duplicates are deduplicated; conflicting source values at identical keys abort ingestion.
8. **Revisions:** actuals use the latest retrieved revision per half-hour, with the maximum of their publication timestamps carried to the hourly result. This is a historical extraction, not an independently archived record of API availability in January. `publishTime` is a source availability proxy; network/ingestion latency is not modelled. A production system should retain observed-at times and all actual revisions for stronger point-in-time replay.
9. **Error:** `forecast − actual`. Positive means overforecast wind, hence potential supply shortfall. MAE = mean absolute error; RMSE = square root of mean squared error; bias = mean signed error. WAPE = `100 × Σ|error| / Σ|actual|`; a zero denominator returns null. Percentiles use linear interpolation between ordered observations.
10. **Risk scenario:** `buffer = max(0, P90(signed errors))`, computed from completed earlier delivery days in this January sample, and only actuals with publication timestamps no later than the selected decision cutoff. Minimum 48 paired hours. The lower wind scenario is `max(0, forecast − buffer)`. This is an empirical scenario, not a confidence interval or guarantee. There is no pre-January training history; the first decisions correctly lack a buffer.

### Pilot findings at 09:00 GMT

The checked-in extraction covers all **744/744** evaluation hours. Reproduce these numbers with `node scripts/report.js`:

| Metric | Value |
| --- | ---: |
| MAE | 2,038.91 MW |
| RMSE | 2,504.76 MW |
| Bias (forecast minus actual) | +1,747.89 MW |
| WAPE | 18.07% |
| P90 absolute error | 4,097.90 MW |

The positive bias suggests a material overforecast tendency in this January sample. This is descriptive evidence for reviewing wind assumptions, not proof of a stable future bias or a recommended fixed hedge. For the 15 January decision, the 24 forecasts were published at 07:30 GMT; mean forecast is 7.93 GW, energy 190.33 GWh, and the prior-history empirical shortfall buffer is 4.38 GW from 312 hourly pairs.

**Scope limitation:** the Elexon series covers operationally metered wind visible to the system operator. It is not all UK renewable generation or a utility's contracted share. No demand, prices, other generation, or portfolio commitments are ingested. A purchase volume cannot be inferred from these two datasets alone.

## Source data and refresh

Only these datasets supply numerical data:

- [FUELHH stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to WIND.
- [WINDFOR stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream), preserving forecast vintages.
- [Elexon wind-generation guidance](https://bmrs.elexon.co.uk/wind-generation), explaining the forecast's hourly resolution and operational-metering coverage.

Data is a fixed historical snapshot, retrieved on 24 October 2026; exact UTC retrieval time and request hashes are in `data/snapshot.json`. It contains 18,688 normalized forecast records and 1,536 WIND half-hour observations. Raw FUELHH includes other fuels and duplicate keys; the normalized file retains WIND only. Source response counts are recorded before filtering/deduplication.

```sh
npm run ingest
```

Ingestion downloads the two stream responses with timeouts/retries, validates them, saves ignored raw files under `data/raw`, and atomically replaces the snapshot only after both succeed. It needs internet access and does not refresh the UI automatically. Rerun `npm run seed` for MongoDB and restart the API after an intentional refresh. Rebuilding/redeploying is needed to update a bundled Vercel snapshot.

Contains BMRS data © Elexon Limited copyright and database right 2026. Review [Elexon's published data terms](https://bmrs.elexon.co.uk/) before wider redistribution.

## Files and directories

| Path | Purpose |
| --- | --- |
| `client/src/main.jsx` | React screens, controls, charts, data loading, and CSV actions |
| `client/src/styles.css` | Responsive visual system and accessible focus/reduced-motion styles |
| `client/index.html` | React HTML entrypoint |
| `server/analytics.js` | Pure forecast selection, hourly matching, metrics, and causal risk history |
| `server/repository.js` | Explicit snapshot/MongoDB loading and in-process cache |
| `server/app.js` | Express HTTP routes, validation, errors, static hosting, and CSV export |
| `server/index.js` | Local/container server entrypoint |
| `api/index.js` | Vercel serverless entrypoint for the same Express app |
| `scripts/ingest.js` | Reproducible source acquisition, validation, deduplication, and hashing |
| `scripts/seed.js` | Idempotent MongoDB indexes and keyed upserts |
| `scripts/report.js` | Reproduce analysis figures without the UI |
| `data/snapshot.json` | Checked-in real historical data and provenance metadata |
| `tests/` | Meaningful analytics, API, and optional MongoDB integration checks |
| `docs/architecture.md` | Technical review and design tradeoffs |
| `docs/demo-script.md` | Two-part, under-ten-minute demo narration and click path |
| `docs/submission.md` | Honest publication status and access-verification instructions |
| `Dockerfile`, `compose.yaml` | Non-root production image and full MERN orchestration |
| `vercel.json` | React build and Express API routing for Vercel |
| `.github/workflows/check.yml` | Dependency installation, tests, frontend build, Docker build |

## API

| Route | Query parameters | Purpose |
| --- | --- | --- |
| `GET /api/health` | none | Storage and snapshot health |
| `GET /api/overview` | `date`, `cutoff` | D+1 profile, audit fields, causal buffer |
| `GET /api/accuracy` | `cutoff` | Month metrics, daily and hourly breakdowns |
| `GET /api/revisions` | `date`, `cutoff`, `hour` | All retained vintages for one target hour |
| `GET /api/export` | `date`, `cutoff`, `scope=day\|month` | Auditable CSV |

Defaults are `date=2026-01-15`, `cutoff=09:00`, `hour=12`. Invalid date, time, or hour returns JSON HTTP 400; unavailable data returns 503. No mutation or trading endpoints are exposed. The public pilot contains public source data only.

## Validation

```sh
npm run check
```

Tests cover inclusive cutoff selection, future forecast exclusion, hour/half-hour aggregation, missing data, valid zeros, metric direction/units, percentile interpolation, January/February boundaries, absent early history, actual publication availability, all snapshot selections, API errors, CSV audit fields, and revision eligibility. The frontend production build is included. Dependency versions are fixed in `package-lock.json`.

For the separate MongoDB path, start the Compose stack first. This checks the real container-hosted API, MongoDB storage mode, seeded record counts, metrics parity, and frontend delivery:

```sh
npm run test:mongo
```

See `docs/submission.md` for the actual environment verification record. Do not assume Docker runtime, browser layout, or deployment checks succeeded just because configuration files exist.

## Deploy on Vercel

The same Express app is exported as a Vercel Node function; Vite produces the static frontend. No second backend service or CORS configuration is needed.

1. Use the [public source repository](https://github.com/Hargun1/bbc7a6fdf5f9).
2. Import that repository in Vercel, using the repository root. `vercel.json` sets the build command and output directory.
3. For a true hosted MERN deployment, configure `MONGODB_URI` with a dedicated Atlas database user; run the seed command against that URI from a trusted local shell. Use the provider's recommended network access controls. Never commit a URI containing credentials.
4. Alternatively omit the URI for the explicit, reproducible bundled-snapshot demo mode. The UI reports its storage accurately.
5. Deploy, open `/api/health`, exercise every page, and replace the pending links at the top of this README.
6. Verify production access without a Vercel login; review the project's deployment-protection settings if required. Vercel runs Node functions, not the Docker image; Docker is the equivalent full-stack local/self-hosted path.

Vercel and YouTube publication still require the owner's authenticated accounts. No public app or video URL can be truthfully supplied before those actions succeed.
