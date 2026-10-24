import React, { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowRight,
  Clock3,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import "./decision-lab.css";

const fmt = (v, d = 0) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-GB", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
const dateLabel = (value) =>
  new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
const signed = (v, d = 0) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${fmt(v, d)}`;
function Stat({ label, value, unit, note }) {
  return (
    <article className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <p>{note}</p>
    </article>
  );
}

export default function DecisionLab({ date, cutoff, onInspect }) {
  const [earlier, setEarlier] = useState("07:00"),
    [confidence, setConfidence] = useState(90);
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [selectedCell, setSelectedCell] = useState(null);
  const [focusCell, setFocusCell] = useState({ day: 0, hour: 0 });
  const atlasRef = useRef(null);
  function moveAtlasFocus(event, day, hour) {
    let nextDay = day,
      nextHour = hour;
    if (event.key === "ArrowLeft") nextHour--;
    else if (event.key === "ArrowRight") nextHour++;
    else if (event.key === "ArrowUp") nextDay--;
    else if (event.key === "ArrowDown") nextDay++;
    else if (event.key === "Home") {
      nextHour = 0;
      if (event.ctrlKey) nextDay = 0;
    } else if (event.key === "End") {
      nextHour = 23;
      if (event.ctrlKey) nextDay = 30;
    } else return;
    event.preventDefault();
    nextDay = Math.max(0, Math.min(30, nextDay));
    nextHour = Math.max(0, Math.min(23, nextHour));
    atlasRef.current
      ?.querySelector(`[data-day="${nextDay}"][data-hour="${nextHour}"]`)
      ?.focus();
  }
  const effectiveEarlier = earlier < cutoff ? earlier : "07:00";
  const query = `date=${date}&cutoff=${cutoff}&earlier=${effectiveEarlier}&confidence=${confidence}`;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelectedCell(null);
    fetch(`/api/lab?${query}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Decision analysis unavailable");
        return result;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, retry]);

  return (
    <>
      <section className="lab-toolbar card">
        <div className="lab-toolbar-intro">
          <FlaskConical size={21} />
          <div>
            <strong>Compare information. Test the risk.</strong>
            <p>
              One decision, two information snapshots, and a chronological
              policy replay.
            </p>
          </div>
        </div>
        <div className="lab-controls">
          <label>
            EARLIER SNAPSHOT
            <select
              value={effectiveEarlier}
              onChange={(e) => setEarlier(e.target.value)}
            >
              {["00:00", "06:00", "07:00", "09:00", "09:20", "09:50"]
                .filter((t) => t < cutoff)
                .map((t) => (
                  <option key={t} value={t}>
                    {t} GMT
                  </option>
                ))}
            </select>
          </label>
          <ArrowRight size={16} />
          <div className="lab-current">
            <small>SELECTED CUTOFF</small>
            <strong>{cutoff} GMT</strong>
          </div>
          <label>
            HISTORICAL PERCENTILE
            <select
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            >
              {[80, 90, 95].map((p) => (
                <option value={p} key={p}>
                  P{p} · empirical buffer
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {error ? (
        <div className="error" role="alert">
          <strong>{error}</strong>
          <p>Try the analysis again.</p>
          <button className="button" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="loading" role="status">
          <FlaskConical size={30} />
          <p>Replaying January decisions in time order…</p>
        </div>
      ) : (
        data && (
          <>
            <div className="lab-section-label">
              <span className="tiny-label">01 · AT THE SELECTED DECISION</span>
              <span>
                {dateLabel(date)} → delivery{" "}
                {dateLabel(data.comparison.rows[0].startTime.slice(0, 10))}
              </span>
            </div>
            <div className="lab-revision-grid">
              <section className="card">
                <div className="card-heading">
                  <div>
                    <h2>What changed before the cutoff?</h2>
                    <p>
                      Two eligible forecast snapshots for the same delivery day
                      · GW
                    </p>
                  </div>
                  <span className="tag">As-of information only</span>
                </div>
                <div className="legend">
                  <span>
                    <i className="legend-line dashed" />
                    {effectiveEarlier} forecast
                  </span>
                  <span>
                    <i className="legend-line green" />
                    {cutoff} forecast
                  </span>
                </div>
                <div className="lab-comparison-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={data.comparison.rows}
                      margin={{ left: 0, right: 18, top: 12, bottom: 10 }}
                    >
                      <CartesianGrid vertical={false} stroke="#efeee9" />
                      <XAxis
                        dataKey="label"
                        interval={3}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#7a776e" }}
                      />
                      <YAxis
                        tickFormatter={(v) => fmt(v / 1000, 0)}
                        width={42}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#7a776e" }}
                      />
                      <Tooltip
                        formatter={(v, name) => [`${fmt(v)} MW`, name]}
                        labelFormatter={(v) => `${v} GMT`}
                      />
                      <Line
                        dataKey="earlierForecast"
                        name={`${effectiveEarlier} forecast`}
                        stroke="#a0a69a"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        dataKey="laterForecast"
                        name={`${cutoff} forecast`}
                        stroke="#148937"
                        strokeWidth={2.4}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-footer">
                  <span>
                    {data.comparison.pairedHours}/24 common forecast hours
                  </span>
                  <span>Actual generation is not used in this chart</span>
                </div>
              </section>
              <section className="card lab-change-summary">
                <div className="tiny-label">THE CHANGE AT A GLANCE</div>
                <div className="lab-revision-number">
                  {signed(
                    data.comparison.energyRevisionMWh == null
                      ? null
                      : data.comparison.energyRevisionMWh / 1000,
                    2,
                  )}
                  <span>GWh</span>
                </div>
                <p>Delivery-day forecast energy revision</p>
                <div className="lab-summary-rule" />
                <div className="lab-summary-row">
                  <span>Hours with a revision</span>
                  <b>
                    {data.comparison.changedHours} /{" "}
                    {data.comparison.pairedHours}
                  </b>
                </div>
                <div className="lab-summary-row">
                  <span>P{confidence} prior-history buffer</span>
                  <b>{fmt(data.selectedRisk.bufferMW)} MW</b>
                </div>
                <div className="lab-summary-row">
                  <span>Prior training pairs</span>
                  <b>{data.selectedRisk.trainingN}</b>
                </div>
                <p className="lab-small">
                  {data.selectedRisk.bufferMW == null
                    ? "Fewer than 48 prior pairs: no buffer is estimated."
                    : `Training deliveries ${dateLabel(data.selectedRisk.trainingFrom)}–${dateLabel(data.selectedRisk.trainingTo)}. Future deliveries do not enter this estimate.`}
                </p>
                <a
                  className="button lab-brief-link"
                  href={`/api/brief?${query}`}
                >
                  <ArrowDownToLine size={15} />
                  Download decision brief
                </a>
                <small>Self-contained HTML · Print / Save as PDF</small>
              </section>
            </div>
            <section className="card lab-revision-audit">
              <div className="card-heading">
                <div>
                  <h2>Largest forecast revisions</h2>
                  <p>Trace the publication behind the change.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Delivery hour</th>
                      <th>{effectiveEarlier} · MW</th>
                      <th>{cutoff} · MW</th>
                      <th>Revision · MW</th>
                      <th>Later publication · UTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.comparison.largestRevisions.length && (
                      <tr>
                        <td colSpan={5}>
                          {data.comparison.pairedHours
                            ? "Forecast values are unchanged between these snapshots."
                            : "No common forecast hours were available at both cutoffs."}
                        </td>
                      </tr>
                    )}
                    {data.comparison.largestRevisions.map((r) => (
                      <tr key={r.hour}>
                        <td>{r.label}</td>
                        <td>{fmt(r.earlierForecast)}</td>
                        <td>{fmt(r.laterForecast)}</td>
                        <td className={r.revisionMW < 0 ? "over" : "under"}>
                          {signed(r.revisionMW)}
                        </td>
                        <td>{r.laterPublishTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="lab-section-label">
              <span className="tiny-label">
                02 · RETROSPECTIVE POLICY EVALUATION
              </span>
              <span>Requires later actual observations · January sample</span>
            </div>
            <section className="lab-policy-comparison card">
              <div>
                <Clock3 size={21} />
                <div>
                  <h2>Did the later information help?</h2>
                  <p>
                    Both cutoff policies evaluated on the exact same{" "}
                    {data.comparison.hindsight.n} of 744 hourly pairs.
                  </p>
                </div>
              </div>
              <div className="lab-policy-values">
                <span>
                  <small>{effectiveEarlier} MAE</small>
                  <b>
                    {fmt(data.comparison.hindsight.earlier.mae)} <i>MW</i>
                  </b>
                </span>
                <ArrowRight size={16} />
                <span>
                  <small>{cutoff} MAE</small>
                  <b>
                    {fmt(data.comparison.hindsight.later.mae)} <i>MW</i>
                  </b>
                </span>
                <span
                  className={
                    data.comparison.hindsight.maeDeltaMW <= 0
                      ? "lab-delta improving"
                      : "lab-delta worsening"
                  }
                >
                  {signed(data.comparison.hindsight.maeDeltaMW)} MW change
                </span>
              </div>
              <p className="lab-small">
                A later cutoff is an analytical scenario, not permission to wait
                beyond the desk’s actual auction deadline. A lower MAE here does
                not establish a future performance improvement.
              </p>
            </section>
            <section className="metrics">
              <Stat
                label={`P${confidence} observed coverage`}
                value={fmt(data.backtest.observedCoverage, 1)}
                unit="%"
                note={`${data.backtest.breaches} lower-scenario breaches / ${data.backtest.n} hours`}
              />
              <Stat
                label="Chronologically evaluated"
                value={fmt(data.backtest.n)}
                unit="hours"
                note={`${data.backtest.evaluatedDays} days · ${data.backtest.excludedDays} excluded for history/data`}
              />
              <Stat
                label="Average wind allowance"
                value={fmt(
                  data.backtest.meanAllowanceMW == null
                    ? null
                    : data.backtest.meanAllowanceMW / 1000,
                  2,
                )}
                unit="GW"
                note="Forecast wind discounted by the scenario"
              />
              <Stat
                label="Residual wind shortfall"
                value={fmt(
                  data.backtest.uncoveredMWh == null
                    ? null
                    : data.backtest.uncoveredMWh / 1000,
                  1,
                )}
                unit="GWh"
                note="Σ max(lower wind scenario − actual, 0) × 1 h"
              />
            </section>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h2>
                    Does a P{confidence} buffer deliver {confidence}% observed
                    coverage?
                  </h2>
                  <p>
                    Freeze history at each decision → calculate its buffer →
                    evaluate the following delivery day.
                  </p>
                </div>
                <span className="tag">Walk-forward replay</span>
              </div>
              <div className="lab-coverage-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={data.backtest.days}
                    margin={{ left: 0, right: 25, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid vertical={false} stroke="#efeee9" />
                    <XAxis
                      dataKey="decisionDate"
                      tickFormatter={(v) => v.slice(-2)}
                      interval={4}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#7a776e" }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      width={45}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#7a776e" }}
                    />
                    <Tooltip
                      formatter={(v) => [`${fmt(v, 1)}%`, "Observed coverage"]}
                      labelFormatter={(v) => `Decision ${dateLabel(v)}`}
                    />
                    <ReferenceLine
                      y={confidence}
                      stroke="#b78e59"
                      strokeDasharray="5 4"
                      label={{
                        value: `P${confidence}`,
                        fill: "#a08766",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <Line
                      dataKey="coverage"
                      name="Observed coverage"
                      stroke="#148937"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "#148937" }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="lab-caveat">
                <ShieldCheck size={17} />
                <p>
                  Coverage means actual wind met or exceeded the lower scenario.
                  Higher coverage comes with a larger reduction in assumed wind;
                  these figures do not measure buying costs. Each buffer uses
                  only completed earlier deliveries with available actuals and
                  at least 48 pairs. January is the evaluation sample; choosing
                  a policy after viewing these results can overfit it. Future
                  coverage is not guaranteed.
                </p>
              </div>
            </section>

            <div className="lab-section-label">
              <span className="tiny-label">03 · FIND THE DIFFICULT HOURS</span>
              <span>Signed forecast error · forecast − actual</span>
            </div>
            <section className="card lab-heatmap-card">
              <div className="card-heading">
                <div>
                  <h2>January error atlas</h2>
                  <p>
                    Choose a cell to inspect its exact error and jump to the
                    delivery-hour publication audit.
                  </p>
                </div>
                <div className="heatmap-legend">
                  <span>
                    <i className="heat-blue" />
                    Underforecast
                  </span>
                  <span>
                    <i className="heat-red" />
                    Overforecast
                  </span>
                  <span>
                    <i className="heat-empty" />
                    Missing
                  </span>
                </div>
              </div>
              <div className="heatmap-scroll">
                <div
                  className="error-atlas"
                  ref={atlasRef}
                  role="group"
                  aria-label="January hourly forecast error atlas. Use arrow keys to move, Enter or Space to select."
                >
                  <div className="heatmap-axis">
                    <span>DECISION</span>
                    {Array.from({ length: 24 }, (_, hour) => (
                      <span key={hour}>{String(hour).padStart(2, "0")}</span>
                    ))}
                  </div>
                  {data.heatmap.days.map((day, dayIndex) => (
                    <div className="heatmap-row" key={day.decisionDate}>
                      <span>{dateLabel(day.decisionDate)}</span>
                      {day.cells.map((cell) => {
                        const error = cell.errorMW;
                        const alpha =
                          error == null
                            ? 0
                            : 0.12 +
                              0.82 *
                                Math.sqrt(
                                  Math.min(
                                    1,
                                    Math.abs(error) / data.heatmap.scaleMW,
                                  ),
                                );
                        const background =
                          error == null
                            ? "#f0efeb"
                            : error === 0
                              ? "#f4f3ee"
                              : error > 0
                                ? `rgba(182,109,72,${alpha})`
                                : `rgba(68,126,151,${alpha})`;
                        const label = `${dateLabel(day.decisionDate)}, delivery ${String(cell.hour).padStart(2, "0")}:00 GMT: ${error == null ? "missing pair" : `${signed(error)} MW ${error === 0 ? "exact forecast" : error > 0 ? "overforecast" : "underforecast"}`}`;
                        return (
                          <button
                            key={cell.hour}
                            style={{ background }}
                            title={label}
                            aria-label={label}
                            data-day={dayIndex}
                            data-hour={cell.hour}
                            tabIndex={
                              focusCell.day === dayIndex &&
                              focusCell.hour === cell.hour
                                ? 0
                                : -1
                            }
                            onFocus={() =>
                              setFocusCell({ day: dayIndex, hour: cell.hour })
                            }
                            onKeyDown={(event) =>
                              moveAtlasFocus(event, dayIndex, cell.hour)
                            }
                            aria-pressed={
                              selectedCell?.decisionDate === day.decisionDate &&
                              selectedCell?.hour === cell.hour
                            }
                            onClick={() =>
                              setSelectedCell({
                                ...cell,
                                decisionDate: day.decisionDate,
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="heatmap-selection" role="status">
                {selectedCell ? (
                  <>
                    <span>
                      Decision {dateLabel(selectedCell.decisionDate)} · delivery{" "}
                      {String(selectedCell.hour).padStart(2, "0")}:00 GMT ·{" "}
                      <strong>{signed(selectedCell.errorMW)} MW</strong>
                    </span>
                    <button
                      className="text-button"
                      onClick={() =>
                        onInspect(selectedCell.decisionDate, selectedCell.hour)
                      }
                    >
                      Inspect publication audit <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <span>
                    Use the arrow keys to move between hours and days. Press
                    Enter or Space to select an error.
                  </span>
                )}
              </div>
            </section>
          </>
        )
      )}
    </>
  );
}
