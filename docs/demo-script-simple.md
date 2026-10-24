# Aeris — simple video script, maximum 10 minutes

**Target: 9 minutes 20 seconds, including clicks and short pauses.** Part 1 is the customer presentation, from 0:00 to 4:40. Part 2 is the technical review, from 4:40 to 9:20. Keep each part under five minutes and the whole recording under ten. These times are rehearsal targets; check your actual recording duration.

**Read only the paragraphs marked “Say.”** The “Click / show” lines are instructions for you. Speak naturally. You do not need to explain every number or every line of code. This is the simpler alternative to `demo-script.md`.

App: https://aeris-bbc7a6fdf5f9.vercel.app  
Repository: https://github.com/Hargun1/bbc7a6fdf5f9

## Before recording

- Close `.env.atlas.local`, `.env.local`, and any tabs showing passwords or connection strings.
- Open the app on **Day-ahead desk**, decision **15 January 2026**, cutoff **09:00 GMT**. Leave **Reveal actuals** off.
- Open the code files listed below in advance. Use the repository's architecture diagram as an overview.
- Run `npm run check` before recording. Keep the real test/build result available to show; do not wait for a fresh run during the video.
- Rehearse downloading and opening the decision brief once so you know where it is saved.
- Do one practice recording. If either part exceeds five minutes, shorten pauses and file switching; do not speed-read.

## Part 1 — presenting to the customer, 0:00–4:40

### 0:00–0:35 — Introduce the problem

**Click / show:** Stay on Day-ahead desk with the dashboard visible.

**Say:**

> “Hello. This is Aeris, a portal to help an electricity team plan tomorrow's supply. Wind generation can change, so the team needs to understand the forecast and how much it can miss. This pilot uses Elexon's wind data for decisions made in January 2026. I will show the customer workflow first, then explain the implementation.”

### 0:35–1:15 — Show tomorrow's forecast

**Click / show:** Point to decision 15 January, delivery 16 January, the 09:00 cutoff, publication time, and main chart.

**Say:**

> “Here, I am deciding on January fifteenth for delivery on January sixteenth. The decision time is nine in the morning. The app uses only forecasts published by that time. It shows an average forecast of about 7.93 gigawatts and forecast energy of about 190 gigawatt-hours. The chart shows the profile through the delivery day. Nine o'clock is a pilot assumption to agree with the customer.”

### 1:15–1:55 — Show forecast accuracy

**Click / show:** Turn on **Reveal actuals** briefly, then open **Forecast accuracy**. Point to MAE and bias.

**Say:**

> “After delivery, we compare the forecast with actual generation. Actuals stay hidden on the main chart until I reveal them. Across the January decisions, we have 744 matched hours. The average absolute error is about 2,039 megawatts. The positive bias means wind was overestimated on average in this sample. The daily results help us find the difficult days.”

### 1:55–2:30 — Compare forecast updates

**Click / show:** Open **Decision lab**. Keep the earlier snapshot at **07:00** and selected cutoff at **09:00**. Show the forecast lines and the comparison below.

**Say:**

> “Decision Lab shows what changed between seven and nine in the morning. The two lines describe the same delivery day using information available at those times. We can inspect the largest changes and their publication times. The accuracy comparison uses the same hours for both choices, keeping the comparison fair. A later update does not automatically give a better result.”

### 2:30–3:30 — Explain the safety allowance

**Click / show:** Scroll to the coverage and wind-allowance cards. Select **P90**, point to **87.8%** coverage, then change to **P95**. Point to the changed coverage and average wind allowance. The spoken 8,000 MW example is illustrative; you do not need to locate those example values on screen.

**Say:**

> “We also test a safety allowance based on earlier forecast errors. For example, a forecast of 8,000 megawatts minus an allowance of 1,000 gives a lower wind level of 7,000. We check how often actual wind stayed at or above that level. P90 and P95 choose different allowance sizes from past errors. P95 uses a larger allowance. Here, P90 achieved 87.8 percent coverage over 672 hours. Three early decisions lacked enough history. P95 increases coverage but also assumes less wind is available. Future results may differ.”

### 3:30–4:10 — Inspect an error and save a report

**Click / show:** Scroll to **January error atlas**, select a colored square, then choose **Inspect publication audit**. Return to **Decision lab**. Near the forecast comparison, click **Download decision brief**. Open the downloaded HTML file briefly, then return to the app.

**Say:**

> “This grid helps me find hours when forecasts were too high or too low. I can select an hour, see its exact error, and inspect the forecast publications behind it. I can also download a report containing the forecasts, decision time, allowance, and data sources. Tomorrow's actual readings are excluded from the report. It can be printed or saved as PDF.”

### 4:10–4:40 — Explain the customer benefit

**Click / show:** Return to **Day-ahead desk**. End the customer section before five minutes.

**Say:**

> “The customer gets a clear forecast, measured historical error, and a record supporting the decision. Calculating an actual purchase quantity would also need the customer's demand, existing contracts, and share of generation. This pilot makes the wind part of that decision understandable and traceable.”

## Part 2 — explaining the implementation, 4:40–9:20

### 4:40–5:20 — Explain the main components

**Click / show:** Show `docs/architecture.md`, then `client/src/main.jsx` around the API requests.

**Say:**

> “React builds the interface and charts. Python with FastAPI handles the backend. MongoDB Atlas stores the records used by the public app. When a user changes the date or cutoff, React requests results from Python and updates the screen. The screens and exports share the same calculation code. Each Python process loads the dataset once and reuses it for later requests.”

### 5:20–6:00 — Explain the data load

**Click / show:** Show `scripts/ingest.py`, then `scripts/seed.py`. Point to WIND filtering and `upsert=True`.

**Say:**

> “The ingestion script downloads Elexon's forecasts and actual generation. Actuals are filtered to WIND. It checks values, handles duplicates, and saves the extraction with source details. Conflicting duplicate values stop the import. A separate script loads the records into MongoDB. Matching delivery and publication times identify each record, so repeating the same load does not create duplicates. The website uses a fixed historical extraction; automatic refresh is not implemented.”

### 6:00–6:45 — Explain selection and calculations

**Click / show:** Show `server/analytics.py`: `day()` for selection and aggregation, then `metrics()`.

**Say:**

> “For each delivery hour, Python selects the newest forecast published by the cutoff. Later publications are excluded. Forecasts are hourly in this extraction, while actuals are half-hourly. I average the two half-hour actuals for an hourly comparison. Both readings must exist. Missing data stays missing, while zero remains valid. Error is forecast minus actual, so positive error means overestimated wind. This module also calculates the accuracy measures.”

### 6:45–7:30 — Explain Decision Lab's rules

**Click / show:** Show `historical_rows()` in `server/analytics.py`, then `risk()` and `backtest()` in `server/decision_tools.py`.

**Say:**

> “The allowance uses completed earlier delivery days, with actual publications available by the decision time. At least 48 matched hours are required. For each decision, the app calculates an allowance using that earlier information and checks the next delivery day. This avoids using later outcomes to set an earlier allowance. Both cutoff policies are compared on the same hours. The decision report lists its fields explicitly, excluding future actual readings.”

### 7:30–8:15 — Explain Docker and Vercel

**Click / show:** Show `Dockerfile`, `compose.yaml`, and `vercel.json`. Have the public `/api/health` response prepared if you want to show the storage label. Do not open credential files.

**Say:**

> “Docker gives reviewers a repeatable local setup. It builds React and runs the app with Python. Compose starts MongoDB, waits for it to be ready, loads the data, and starts the app. A volume keeps local database data across container recreation. The public deployment uses Vercel for React and the Python API, connected to Atlas. Vercel is a separate hosting path from Docker. The database connection is stored as a server-side secret.”

### 8:15–9:00 — Show tests and reliability checks

**Click / show:** Show `tests/test_decision_tools.py`, especially `test_future_actuals_cannot_change_selected_risk_or_brief`. Then show the real test/build result and successful GitHub Actions run.

**Say:**

> “There are 55 Python test cases covering calculations, time rules, missing data, and API behavior. One test removes future actual readings and checks that an earlier decision's allowance and report remain unchanged. Automated checks also build React, start Docker and MongoDB, repeat the data load, and compare API results with reference calculations. The interface shows loading and error states and prevents old responses from replacing newer selections. A configured database failure produces a visible error.”

### 9:00–9:20 — Finish the handover

**Click / show:** Show the README's AI disclosure and documentation links. Stop after this paragraph; the remaining time is a margin.

**Say:**

> “The README covers setup, documentation, and AI assistance. The main limitations are the short evaluation period and incomplete historical revision records. Longer evaluation and a better source archive are next steps. Thank you.”

## Quick reminders — do not read these aloud

- **Cutoff:** the last publication time allowed for a decision.
- **MAE:** average size of the forecast error, ignoring its direction.
- **Bias:** average signed error; positive means overforecast wind.
- **Buffer / safety allowance:** an amount subtracted from the forecast, based on earlier errors.
- **P90 / P95:** the 90th / 95th percentile of earlier signed errors, floored at zero. P95 gives a buffer at least as large as P90 for the same history. These names do not promise future coverage.
- **Observed coverage:** the share of evaluated hours when actual wind met or exceeded the lower wind scenario. It is not overall forecast accuracy.
- **672 hours:** 28 evaluated decisions × 24 delivery hours; three early decisions lacked enough history.
- **Audit:** checking which forecast versions were published and which were eligible.
- **Brief:** the downloadable decision report; the HTML file can be printed to PDF.
- **Public health:** https://aeris-bbc7a6fdf5f9.vercel.app/api/health
- **Successful CI evidence:** https://github.com/Hargun1/bbc7a6fdf5f9/actions/runs/40118053377

## After recording

1. Check that each part stays under five minutes and the complete video stays under ten.
2. Check screen readability and sound.
3. Upload the video to YouTube as **Unlisted**.
4. Open the exact app, repository, and video URLs in incognito while signed out. Check access and playback.
5. Submit the actual URLs and applicant details at https://forms.cloud.microsoft/r/FTX6K2bbnU.
