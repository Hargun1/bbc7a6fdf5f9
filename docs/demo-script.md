# Two-part demo — target 9 minutes 15 seconds, maximum 10

Use the live app at https://aeris-bbc7a6fdf5f9.vercel.app. Record at 1080p with readable text and clear audio. The customer part is 4:30 and the technical part is 4:45; neither initial overview exceeds five minutes. Timing below is a pacing target, not a recording.

## Part 1 — customer pilot (0:00–4:30)

### 0:00–0:45 · Day-ahead desk, decision 15 Jan, 09:00 cutoff

“Aeris answers three questions for the day-ahead desk: which wind forecast could we have known, how much does that forecast miss, and how defensible is the risk allowance we use? This pilot uses only the two requested Elexon wind series, for decisions made in January 2026. Here we are deciding on January fifteenth for delivery on the sixteenth. Every hour uses the latest forecast published by our selected cutoff.”

Point to 07:30 publication, 7.93 GW average, 190.33 GWh forecast energy, and the hourly profile. Explain that 09:00 is a pilot desk assumption, to be agreed with the client's trading venue and submission lead time.

### 0:45–1:20 · Reveal hindsight; Forecast accuracy

“Actuals are hidden until I choose to reveal hindsight. Across the January decisions we have 744 matched hours. At nine o'clock, mean absolute error is about 2,039 megawatts, and bias is positive 1,748: wind was overforecast on average in this sample. The daily scorecard identifies the difficult decisions rather than hiding them inside a monthly average.”

### 1:20–2:15 · Decision Lab: compare 07:00 and selected 09:00

“Decision Lab shows what changed between two information snapshots. The two curves use only publications available at their respective cutoffs. We can inspect the largest revisions and the publication behind each one. The separate retrospective scorecard evaluates both cutoff policies on exactly the same hours, so missing data cannot make a policy look better by changing the sample. Later information did not automatically improve MAE in this January comparison; the portal shows the result rather than assuming it.”

### 2:15–3:15 · Decision Lab: P90 replay; change to P95

“The dashed desk scenario uses a historical error allowance. Here we test whether that allowance held up. For every decision, I freeze its information set, estimate the buffer from completed earlier delivery days only, and evaluate the following day. A P90 allowance achieved 87.8 percent observed coverage over 672 eligible hours; the first three decisions are excluded because history was insufficient. Changing to P95 shows both coverage and the reduction in assumed wind. The tradeoff matters: higher coverage alone does not establish a better procurement policy. This is a transparent historical scenario, not a guaranteed prediction bound.”

### 3:15–4:00 · Error atlas; audit drill-down; brief

“The error atlas locates the difficult delivery hours. Selecting one gives its exact signed error and opens the original publication audit. For the desk's decision record, I download a portable brief: selected forecasts, cutoff, historical sample, scenario, revisions, and source hashes. It includes no future actual readings and can be printed or saved as PDF. We can reproduce the exact record from its identifier.”

### 4:00–4:30 · Scope and customer value

“This pilot gives your team an auditable wind assumption and measured uncertainty. It does not know your demand, existing commitments, or allocated share of national wind, so it does not claim a purchase quantity or financial savings. Those are the next inputs for a portfolio-aware procurement workflow.”

## Part 2 — technical review (4:30–9:15)

### 4:30–5:15 · Architecture and runtime

Show `docs/architecture.md`.

“The frontend is React with Recharts. The whole backend is Python: FastAPI routes, pure analytics, ingestion, MongoDB access through PyMongo, CSV exports, and brief generation. Docker builds React in a Node stage and runs Python as a non-root user. Compose starts MongoDB, waits for health, seeds idempotently, then starts the application. Vercel serves React statically and invokes the same FastAPI app. The public pilot reports snapshot storage explicitly; the MongoDB path is exercised by CI.”

### 5:15–6:10 · Data contract and core analysis

Show `scripts/ingest.py` and `server/analytics.py`.

“Ingestion preserves target and publication times, filters FUELHH to WIND, validates values, and rejects conflicting duplicates. Both downloads must succeed before atomic snapshot replacement. Source hashes and request URLs provide provenance. WINDFOR is hourly in the extraction; actuals are half-hourly, so I compare the forecast to the mean of both actual readings. Missing data remains null, and zero remains valid. Forecast selection is per target hour with publication time at or before the chosen cutoff.”

### 6:10–7:10 · Decision Lab: fairness and temporal isolation

Show `server/decision_tools.py` and the relevant tests.

“Cutoff policies are compared on the same target/actual cohort. The risk replay uses an expanding history of completed earlier deliveries whose actual publication was available by the decision cutoff, with at least 48 pairs. Coverage is actual wind meeting the clipped lower scenario; allowance and residual shortfall expose its tradeoff. We do not turn a pooled percentile into an unvalidated confidence claim. The brief explicitly enumerates permitted fields, rather than serializing a response containing hindsight. A test deletes future actuals and proves the report is unchanged.”

### 7:10–8:00 · Checks and CI

Run `npm run check`; show the verified GitHub Actions run.

“The suite has 55 Python checks covering selection, alignment, missing and zero values, date boundaries, metric units, causal history, ingestion conflicts, API validation, CSV, fair cohorts, buffer clipping, report isolation, and escaped HTML. CI also builds the real Docker/Python/MongoDB stack, repeats the seed, and checks API results against the same snapshot calculations. During the Python migration, every monthly output and 124 day profiles were compared with the preceding implementation.”

### 8:00–8:40 · Frontend and implementation practices

Show `client/src/DecisionLab.jsx`, `server/app.py`, and deployment files.

“React guards against stale asynchronous responses and exposes loading, retry, missing-history, and hindsight states. The atlas has keyboard navigation and a direct audit path. CSV and reports share backend selection logic. The report is self-contained, escaped, and script-free. Database failures do not silently change storage; credentials remain outside the repository. Vercel previews keep their access protection, while the production domain is publicly accessible.”

### 8:40–9:15 · Boundaries and knowledge transfer

Return to Methodology/README.

“The UI takes visual cues from GridBricks by REint while remaining an independent assessment pilot. The README discloses AI assistance, documents commands and files, and links the live app. Limitations are explicit: source publication is an availability proxy, actual revision history is not independently archived, January is a short correlated evaluation sample, and policy selection after viewing it can overfit. Production work would add observed-at ingestion, longer out-of-sample validation, monitoring, access control, and utility portfolio inputs.”

## Before uploading

- Record a short audio/readability test first; hide unrelated tabs and notifications.
- Show the actual working portal and code. Keep the complete video under ten minutes.
- Upload to YouTube as **Unlisted**. Verify processing, sound, and playback.
- Verify the exact production app, public repository, and video URLs in incognito while signed out.
- Do not submit the form before the required video exists.
