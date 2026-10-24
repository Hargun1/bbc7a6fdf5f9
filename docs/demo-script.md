# Aeris video demo — target 8–9 minutes, maximum 10

Record the real running portal in 1080p. Keep the narration natural and pause briefly after changing a view. The times below are pacing targets; keep each part under five minutes and the whole video under ten. This script is not a recording or a YouTube upload.

## Part 1 — customer pilot presentation (0:00–4:15)

### 0:00–0:35 · Start on Day-ahead desk, decision 15 Jan, cutoff 09:00

“Aeris gives your day-ahead desk a clear answer to two questions: what wind forecast could we rely on when we made our decision, and how large have the misses been? This pilot uses only the national Elexon wind forecast and actual generation series, for decisions made during January 2026. We can replay each decision without allowing a later forecast to rewrite the past.”

### 0:35–1:25 · Point to dates, cutoff, cards, and forecast publication

“Here we are deciding on the fifteenth of January for delivery on the sixteenth. The default is a nine o'clock desk cutoff, an explicit operating assumption that we would agree with your team. Every target hour uses the latest publication available by then. In this example the forecast was published at seven thirty. The expected average wind is 7.93 gigawatts, equivalent to 190.33 gigawatt hours across the complete delivery day. The chart makes the daily shape visible, rather than hiding it inside a single average.”

### 1:25–2:10 · Hover over chart; explain dashed line and historical sample

“The dashed line explores a lower wind contribution. It subtracts a shortfall buffer estimated from completed earlier delivery days only. For this decision, there are 312 hourly comparisons already available, and the historical ninetieth percentile overforecast is approximately 4.38 gigawatts. This is a transparent scenario for discussion, not a guaranteed bound. It tells the desk that the uncertainty can be material, and makes its basis inspectable.”

### 2:10–2:45 · Reveal actuals; inspect hourly audit; export CSV

“Actuals are hidden until we explicitly reveal hindsight. That distinction matters: traders could know the forecast before delivery, but actual generation arrives later. Now the actual hourly profile shows where delivery differed. The audit table gives the forecast's publication time and lead time for every hour. The CSV carries those same timestamps so your team can reproduce or challenge the selection.”

### 2:45–3:40 · Switch to Forecast accuracy; show scorecards and hourly bias

“Across all 31 January decisions, we have 744 matched hourly observations. At the nine o'clock policy, the mean absolute error is around 2,039 megawatts, and root mean squared error is around 2,505. Forecast bias is positive 1,748 megawatts: the sample overforecast wind on average. Weighted absolute error is 18.07 percent. The daily chart identifies difficult days, and the hourly chart shows the direction of the miss over the delivery day. We can inspect any individual decision, or change the cutoff to compare what a later information set would have provided.”

### 3:40–4:15 · Data & provenance, then Methodology

“Every figure is backed by the two requested Elexon feeds, with retained forecast vintages, source requests, and checksums. We compare hourly forecasts with the mean of the two actual half-hours. The pilot does not have your demand, existing contracts, or portfolio allocation, so it does not claim to calculate your purchase volume. Its value is an auditable wind assumption and quantified uncertainty that your procurement process can use.”

## Part 2 — internal technical review (4:15–8:50)

### 4:15–4:55 · Show architecture diagram in docs/architecture.md

“The implementation uses the requested updated MERN stack: React for the portal, Express and Node for the API and analysis, and MongoDB for storage. Ingestion runs offline and produces a versioned real-data snapshot. Docker Compose starts MongoDB, seeds it with keyed upserts, then starts the application. A separate snapshot adapter gives a reviewer a zero-configuration mode, and the interface states which store is actually used.”

### 4:55–5:45 · Open scripts/ingest.js and server/analytics.js

“Ingestion calls the two stream endpoints, preserving both delivery and publication time. FUELHH is filtered to WIND. Requests have timeouts and retries; validation rejects invalid rows and conflicting duplicates. The output is replaced atomically, with raw response hashes in its metadata. The analysis engine is pure JavaScript, separate from I/O. For every target hour, it sorts forecast vintages and takes the latest one at or before the decision cutoff.”

### 5:45–6:35 · Show day(), metrics(), overview()

“The source forecast is hourly, so we average the two actual half-hours instead of manufacturing half-hour forecast values. Both readings are required. Missing values remain null, valid zero generation is retained, and coverage accompanies the statistics. Error is forecast minus actual. The risk calculation has a stronger historical filter: only completed delivery days before this decision, and actuals published no later than its cutoff. With fewer than 48 pairs, there is no risk buffer.”

### 6:35–7:15 · Open tests; run npm run check

“The tests exercise causal cutoff selection, missing half-hours, valid zeros, metric signs and units, boundary dates, actual publication times, and minimum risk history. We also verify all real snapshot selections across the offered cutoffs. API tests check validation, export audit fields, revision eligibility, and coverage. The production frontend build runs in the same check command. The MongoDB path has a separate integration check; the verification record states which checks actually ran.”

### 7:15–8:00 · Show repository/app/frontend and deployment files

“The repository adapter loads and caches the fixed January dataset per process. Configured MongoDB failures are visible rather than silently replaced by snapshot data. Express validates query parameters and exposes read-only routes. React keeps the decision and hindsight states explicit, handles loading and retry, and guards against older asynchronous responses overwriting newer settings. CSV calculations share the server logic. The Docker image runs non-root, and Vercel uses static React assets plus the same Express handler as a Node function.”

### 8:00–8:50 · Return to Methodology and README

“The main assumptions are explicit in the product and README. January is the decision window, so the final delivery day is February first. Nine o'clock is a pilot policy, not a universal auction deadline. The Elexon series covers operationally metered wind rather than every embedded wind source. Actuals are a historical extraction, not an app-observed January archive; production replay needs observed-at timestamps and revision history. The empirical buffer needs longer, out-of-sample validation. Before purchase recommendations, we need the utility's demand, allocation, contracts, and risk policy. The README discloses AI assistance and provides startup, code-map, and deployment instructions.”

## Recording checklist

- Record a 15-second test first: readable text and clear audio.
- Keep browser zoom around 100–110%; hide unrelated tabs and notifications.
- Show real loading and interaction, not screenshots presented as a live demo.
- Use two chapters: `0:00 Customer pilot` and the actual start time of the technical section.
- Verify the final duration is at most 10 minutes and each initial overview at most 5 minutes.
- Upload to YouTube with **Unlisted** visibility. Confirm processing and playability before submission.
- Test the YouTube, app, and public repository URLs in a private/incognito browser while signed out.
