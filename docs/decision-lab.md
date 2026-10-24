# Decision Lab — useful differentiators for the demo

These additions extend the procurement workflow using only the two original Elexon datasets. They do not place trades, ingest demand/prices, or claim money saved.

## 1. Forecast revisions and fair cutoff comparison

Choose an earlier information snapshot and compare it with the desk's selected cutoff. The selected-day chart uses only eligible forecast publications; it does not reveal delivery-day actuals. A summary quantifies changed hours, daily forecast-energy revision, and the largest revisions with publication timestamps.

The separate retrospective scorecard evaluates both cutoff policies on **exactly the same target/actual cohort**. Missing earlier forecasts cannot improve a policy's score merely by changing which hours are evaluated. Later information can improve or worsen this sample's MAE; the screen does not assume later is always better or advise waiting beyond a trading deadline.

Implementation: `DecisionTools.compare()` in `server/decision_tools.py`. Tests remove an earlier observation and confirm identical cohorts, partial-day energy handling, signs, and cutoff eligibility.

## 2. Chronological validation of the empirical buffer

Choose P80, P90, or P95. For every January decision:

1. Freeze its source publication cutoff.
2. Use only completed earlier delivery days and actuals published by that cutoff.
3. Require at least 48 paired hourly observations.
4. Estimate `buffer = max(0, percentile(forecast - actual))`.
5. Form `lower wind = max(0, forecast - buffer)` and evaluate the following delivery day.

The screen reports coverage, eligible/excluded samples, the average reduction in assumed wind, and remaining wind shortfall. Coverage means `actual >= lower wind`, weighted equally over evaluated one-hour pairs. Shortfall is `sum(max(lower wind - actual, 0)) * 1 hour`; the average allowance is the total wind discounted divided by evaluated hours. This exposes the coverage/allowance tradeoff instead of presenting coverage alone as a success score.

At 09:00/P90, the fixed snapshot gives 672 evaluated hours over 28 decisions, 3 excluded early decisions, 82 breaches, and **87.7976% observed coverage**. Residual wind shortfall is 119,419.5 MWh. These are national-wind scenario statistics, not a utility's purchase volumes or financial gains.

This is a walk-forward policy replay, not an independently calibrated forecast interval. January is the evaluation sample. Choosing a percentile after inspecting January can overfit it; future performance is not guaranteed. Adjacent hours are correlated, and actual revision availability is subject to the existing historical-extraction limitation.

The chronological evaluation principle is consistent with [scikit-learn's time-series split guidance](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html); the implementation uses pure Python and does not add a machine-learning dependency.

## 3. Error atlas with audit drill-down

The 31-by-24 signed-error heatmap shows which decision/delivery hours were overforecast or underforecast. Missing observations stay missing. Select a cell for its exact signed MW error, then open the original hour's publication audit. Keyboard users have one tab stop into the atlas, arrow-key movement, and Enter/Space selection.

The atlas is explicitly retrospective. It is not part of the as-of decision record.

## 4. Portable decision brief

Download a self-contained HTML record of the chosen decision date, cutoff, forecast profile, revision summary, historical percentile scenario, training window/sample, and source provenance. It works offline and has print styling for Print / Save as PDF. A JSON representation is available at `/api/brief?format=json` for reproducibility.

The record has a deterministic 16-character SHA-256-derived ID. All dynamic text is HTML-escaped; no scripts or external resources are included. The report deliberately enumerates permitted fields rather than serializing the full hindsight response. Tests prove changing/removing future actual observations does not change the report, and check that hindsight values are absent.

## A strong 60-second walkthrough

“On Decision Lab, I can see exactly what changed between the two information sets. The retrospective comparison uses the same hours for both policies. Then I test the risk buffer chronologically: every day only learns from information already available. P90 delivered 87.8% coverage in this sample, so I show the observed result and its tradeoff rather than claiming a guarantee. The error atlas identifies the difficult hours and links back to the source publication. Finally I download the decision record, which contains the evidence available at the cutoff and no future actual readings.”
