import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Gauge,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Wind,
  X,
  Activity,
  Clock3,
  CalendarDays,
  Layers3,
} from "lucide-react";
import "./styles.css";

const fmt = (v, d = 0) =>
  v === null || v === undefined
    ? "—"
    : Number(v).toLocaleString("en-GB", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
const gw = (v) => fmt(v === null ? null : v / 1000, 2);
const shortDate = (d) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  });
const stamp = (s) =>
  s
    ? new Date(s).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      })
    : "Unavailable";
const TABS = [
  ["desk", "Day-ahead desk", LayoutDashboard],
  ["accuracy", "Forecast accuracy", Activity],
  ["data", "Data & provenance", Database],
  ["method", "Methodology", BookOpen],
];
function api(path) {
  return fetch(path).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Request failed");
    return data;
  });
}
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{label} GMT</strong>
      {payload
        .filter((p) => p.value !== null)
        .map((p) => (
          <div key={p.dataKey}>
            <i style={{ background: p.color }} />
            {p.name}
            <b>{fmt(p.value)} MW</b>
          </div>
        ))}
    </div>
  );
}
function Metric({ label, value, unit, note, icon: Icon, accent }) {
  return (
    <article className={`metric ${accent ? "accent" : ""}`}>
      <div className="metric-label">
        {label}
        {Icon && <Icon size={17} />}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <p>{note}</p>
    </article>
  );
}
function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function App() {
  const [tab, setTab] = useState("desk"),
    [date, setDate] = useState("2026-01-15"),
    [cutoff, setCutoff] = useState("09:00");
  const [overview, setOverview] = useState(null),
    [accuracy, setAccuracy] = useState(null),
    [revisions, setRevisions] = useState([]);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [showActual, setShowActual] = useState(false),
    [mobile, setMobile] = useState(false),
    [hour, setHour] = useState(12),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api(`/api/overview?date=${date}&cutoff=${cutoff}`),
      api(`/api/accuracy?cutoff=${cutoff}`),
    ])
      .then(([o, a]) => {
        if (active) {
          setOverview(o);
          setAccuracy(a);
        }
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
  }, [date, cutoff, retry]);
  useEffect(() => {
    let active = true;
    api(`/api/revisions?date=${date}&cutoff=${cutoff}&hour=${hour}`)
      .then((r) => {
        if (active) setRevisions(r);
      })
      .catch(() => {
        if (active) setRevisions([]);
      });
    return () => {
      active = false;
    };
  }, [date, cutoff, hour, retry]);
  function shift(delta) {
    const n = Number(date.slice(-2)) + delta;
    if (n >= 1 && n <= 31) {
      setDate(`2026-01-${String(n).padStart(2, "0")}`);
      setShowActual(false);
    }
  }
  function navigate(t) {
    setTab(t);
    setMobile(false);
  }
  const o = overview,
    a = accuracy,
    exportUrl = `/api/export?date=${date}&cutoff=${cutoff}&scope=${tab === "accuracy" ? "month" : "day"}`;
  const risk = o?.risk;
  const headings = {
    desk: [
      "THE TRADING WORKSPACE",
      "A clearer view of tomorrow.",
      "Replay the wind forecast available before your day-ahead decision.",
    ],
    accuracy: [
      "JANUARY 2026 · RETROSPECTIVE",
      "Know the forecast. Know the error.",
      "Measure the forecast you could have used, against what actually happened.",
    ],
    data: [
      "A TRACEABLE FOUNDATION",
      "Every number has a source.",
      "Real Elexon records, preserved in a reproducible pilot snapshot.",
    ],
    method: [
      "BUILT FOR TRUST",
      "The reasoning behind the numbers.",
      "Explicit assumptions. Reproducible analysis. No future forecasts in the replay.",
    ],
  };
  return (
    <div className="shell">
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("desk");
          }}
        >
          <span className="brand-icon">
            <Wind size={25} />
          </span>
          aeris<span className="brand-dot">®</span>
        </a>
        <div className="workspace-label">
          ENERGY INTELLIGENCE <span>GB</span>
        </div>
        <nav aria-label="Main navigation">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "nav-item active" : "nav-item"}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              {label}
              {tab === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="pilot-art">
            <Wind size={42} />
            <div className="orbit one" />
            <div className="orbit two" />
          </div>
          <span className="tiny-label">THE JANUARY PILOT</span>
          <h3>
            Confidence starts
            <br />
            with visibility.
          </h3>
          <p>
            Day-ahead wind intelligence.
            <br />
            One decision at a time.
          </p>
          <button onClick={() => navigate("method")}>
            Explore the methodology <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">GB</span>
          <div>
            Great Britain desk<small>National wind · Elexon</small>
          </div>
          <ShieldCheck size={17} />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{TABS.find((t) => t[0] === tab)[1]}</strong>
          </div>
          <div className="top-right">
            <span className="snapshot-pill">
              <i />
              Historical pilot
            </span>
            <span className="top-divider" />
            <span className="top-date">January 2026</span>
            <button
              className="icon-button"
              aria-label="Read methodology"
              onClick={() => navigate("method")}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">{headings[tab][0]}</div>
              <h1>{headings[tab][1]}</h1>
              <p>{headings[tab][2]}</p>
            </div>
            <a className="button secondary export-top" href={exportUrl}>
              <ArrowDownToLine size={16} />
              Export CSV
            </a>
          </div>
          <section className="decision-bar" aria-label="Decision settings">
            <div className="date-group">
              <CalendarDays size={18} />
              <div>
                <label htmlFor="decision-date">DECISION DATE</label>
                <div className="date-input-wrap">
                  <button
                    className="icon-button"
                    aria-label="Previous decision day"
                    disabled={date === "2026-01-01"}
                    onClick={() => shift(-1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    id="decision-date"
                    type="date"
                    min="2026-01-01"
                    max="2026-01-31"
                    value={date}
                    onChange={(e) => {
                      if (
                        /^2026-01-(0[1-9]|[12]\d|3[01])$/.test(e.target.value)
                      ) {
                        setDate(e.target.value);
                        setShowActual(false);
                      }
                    }}
                  />
                  <button
                    className="icon-button"
                    aria-label="Next decision day"
                    disabled={date === "2026-01-31"}
                    onClick={() => shift(1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="delivery-arrow">
              <ArrowRight size={18} />
            </div>
            <div className="delivery-date">
              <span>DELIVERY DAY</span>
              <strong>{o ? shortDate(o.deliveryDate) : "—"} 2026</strong>
            </div>
            <div className="bar-divider" />
            <div className="cutoff-group">
              <Clock3 size={18} />
              <div>
                <label htmlFor="cutoff">FORECAST CUTOFF</label>
                <select
                  id="cutoff"
                  value={cutoff}
                  onChange={(e) => setCutoff(e.target.value)}
                >
                  <option value="09:00">09:00 GMT · Morning desk</option>
                  <option value="09:20">09:20 GMT · Alternative cutoff</option>
                  <option value="09:50">09:50 GMT · Alternative cutoff</option>
                  <option value="15:00">15:00 GMT · Afternoon desk</option>
                </select>
              </div>
            </div>
            <div className="bar-status">
              <ShieldCheck size={16} />
              As-of selection
            </div>
          </section>
          {error ? (
            <div className="error" role="alert">
              <strong>We couldn’t load the analysis.</strong>
              <p>{error}</p>
              <button className="button" onClick={() => setRetry((n) => n + 1)}>
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="loading" role="status">
              <Wind className="spin" size={32} />
              <p>Aligning forecasts and actuals…</p>
            </div>
          ) : o && a ? (
            <>
              {tab === "desk" && (
                <>
                  <div className="section-caption">
                    <span>
                      <i className="green-dot" />
                      FORECAST AT YOUR DECISION
                    </span>
                    <span>
                      Latest selected publication{" "}
                      <b>{stamp(o.summary.latestPublish)} GMT</b>
                    </span>
                  </div>
                  <section className="metrics">
                    <Metric
                      accent
                      label="Average wind forecast"
                      value={gw(o.summary.mean)}
                      unit="GW"
                      note={`Across ${o.summary.forecastHours} of 24 delivery hours`}
                      icon={Wind}
                    />
                    <Metric
                      label="Forecast wind energy"
                      value={
                        o.summary.energy === null
                          ? "—"
                          : fmt(o.summary.energy / 1000, 1)
                      }
                      unit="GWh"
                      note="Sum of hourly MW × 1 hour"
                      icon={Layers3}
                    />
                    <Metric
                      label="Historical shortfall buffer"
                      value={risk.buffer === null ? "—" : gw(risk.buffer)}
                      unit={risk.buffer === null ? "" : "GW"}
                      note={
                        risk.buffer === null
                          ? `Need ${risk.minimumSamples} prior hours · ${risk.n} available`
                          : `P90 overforecast · ${risk.n} prior hourly pairs`
                      }
                      icon={ShieldCheck}
                    />
                    <Metric
                      label="Peak wind forecast"
                      value={gw(o.summary.peak)}
                      unit="GW"
                      note={`Oldest forecast age: ${fmt(o.summary.maxAgeHours, 1)} hours at cutoff`}
                      icon={Gauge}
                    />
                  </section>
                  <section className="card forecast-card">
                    <div className="card-heading">
                      <div>
                        <h2>
                          Tomorrow’s wind profile{" "}
                          <span className="tag">
                            {shortDate(o.deliveryDate)}
                          </span>
                        </h2>
                        <p>Hourly national wind generation · GW</p>
                      </div>
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={showActual}
                          onChange={(e) => setShowActual(e.target.checked)}
                        />
                        <span className="switch" />
                        Reveal actuals{" "}
                        <span className="replay-tag">Hindsight</span>
                      </label>
                    </div>
                    <div className="legend">
                      <span>
                        <i className="legend-line green" />
                        Selected forecast
                      </span>
                      {risk.buffer !== null && (
                        <span>
                          <i className="legend-line dashed" />
                          Forecast less historical buffer
                        </span>
                      )}
                      {showActual && (
                        <span>
                          <i className="legend-line orange" />
                          Actual hourly mean
                        </span>
                      )}
                    </div>
                    <div className="profile-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={o.rows}
                          margin={{ left: 0, right: 18, top: 20, bottom: 6 }}
                        >
                          <defs>
                            <linearGradient
                              id="windFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#36a78d"
                                stopOpacity={0.22}
                              />
                              <stop
                                offset="100%"
                                stopColor="#36a78d"
                                stopOpacity={0.01}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="#edf0ec" />
                          <XAxis
                            dataKey="label"
                            interval={3}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#82908a", fontSize: 11 }}
                            dy={10}
                          />
                          <YAxis
                            domain={[0, "auto"]}
                            tickFormatter={(v) => fmt(v / 1000, 0)}
                            tickLine={false}
                            axisLine={false}
                            width={42}
                            tick={{ fill: "#82908a", fontSize: 11 }}
                          />
                          <Tooltip content={<Tip />} />
                          <Area
                            type="monotone"
                            dataKey="forecast"
                            name="Selected forecast"
                            stroke="#20836e"
                            strokeWidth={2.6}
                            fill="url(#windFill)"
                            connectNulls={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="conservative"
                            name="Forecast less buffer"
                            stroke="#85a59a"
                            strokeWidth={1.6}
                            strokeDasharray="5 5"
                            dot={false}
                            isAnimationActive={false}
                          />
                          {showActual && (
                            <Line
                              type="monotone"
                              dataKey="actual"
                              name="Actual hourly mean"
                              stroke="#cf9260"
                              strokeWidth={2.2}
                              dot={false}
                              isAnimationActive={false}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-footer">
                      <span>
                        <Clock3 size={14} />
                        All times Europe/London · GMT in January
                      </span>
                      <span>
                        {o.summary.forecastHours === 24 ? (
                          <>
                            <Check size={14} />
                            24 / 24 forecast hours covered
                          </>
                        ) : (
                          `${o.summary.forecastHours} / 24 forecast hours covered`
                        )}
                      </span>
                    </div>
                  </section>
                  <div className="bottom-grid">
                    <section className="insight-card">
                      <div className="insight-icon">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <div className="tiny-label">THE PROCUREMENT LENS</div>
                        <h2>Plan for the wind that may not arrive.</h2>
                        {risk.buffer === null ? (
                          <p>
                            There are fewer than 48 completed prior hourly pairs
                            in this January pilot. A historical buffer is not
                            yet available.
                          </p>
                        ) : (
                          <p>
                            In the available prior history, 90% of hourly
                            overforecast errors were at or below{" "}
                            <strong>{gw(risk.buffer)} GW</strong>. Use the
                            dashed line to explore a lower wind contribution.
                          </p>
                        )}
                        <p className="fine-print">
                          Empirical scenario, not a guaranteed bound. National
                          wind alone cannot determine your utility’s purchase
                          volume.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("accuracy")}
                        >
                          Examine forecast accuracy <ArrowRight size={15} />
                        </button>
                      </div>
                    </section>
                    <section className="card source-card">
                      <div className="source-title">
                        <Database size={18} />
                        <h3>Decision-ready, traceable data</h3>
                        <span className="status-small">ELEXON</span>
                      </div>
                      <div>
                        <span>Forecast selection</span>
                        <b>Latest per hour ≤ {cutoff} GMT</b>
                      </div>
                      <div>
                        <span>Actuals alignment</span>
                        <b>Two half-hours → hourly mean</b>
                      </div>
                      <div>
                        <span>History available</span>
                        <b>{risk.n} completed hourly pairs</b>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => navigate("data")}
                      >
                        Inspect data provenance <ArrowUpRight size={14} />
                      </button>
                    </section>
                  </div>
                  <section className="card detail-card">
                    <div className="card-heading">
                      <div>
                        <h2>Delivery-hour audit</h2>
                        <p>
                          The selected forecast and its publication time, hour
                          by hour.
                        </p>
                      </div>
                      <span className="tag">MW</span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Delivery hour · GMT</th>
                            <th>Forecast · MW</th>
                            {showActual && (
                              <>
                                <th>Actual · MW</th>
                                <th>Error · MW</th>
                              </>
                            )}
                            <th>Forecast published · GMT</th>
                            <th>Lead time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.rows.map((r) => (
                            <tr key={r.hour}>
                              <td>
                                {r.label}–{String(r.hour + 1).padStart(2, "0")}
                                :00
                              </td>
                              <td className="strong">{fmt(r.forecast)}</td>
                              {showActual && (
                                <>
                                  <td>{fmt(r.actual)}</td>
                                  <td
                                    className={r.error > 0 ? "over" : "under"}
                                  >
                                    {r.error > 0 ? "+" : ""}
                                    {fmt(r.error)}
                                  </td>
                                </>
                              )}
                              <td>{stamp(r.publishTime)}</td>
                              <td>{fmt(r.leadHours, 1)} h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
              {tab === "accuracy" && (
                <Accuracy
                  a={a}
                  cutoff={cutoff}
                  onDay={(d) => {
                    setDate(d);
                    setShowActual(true);
                    navigate("desk");
                  }}
                />
              )}
              {tab === "data" && (
                <DataView
                  o={o}
                  revisions={revisions}
                  hour={hour}
                  setHour={setHour}
                  cutoff={cutoff}
                />
              )}
              {tab === "method" && <Method />}
            </>
          ) : null}
          <footer className="page-footer">
            <span>
              <Wind size={14} />
              Aeris · Wind intelligence
            </span>
            <span>
              January 2026 pilot · Elexon WINDFOR + FUELHH (WIND) ·{" "}
              {o?.storage || "Loading"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Accuracy({ a, cutoff, onDay }) {
  const m = a.metrics,
    max = Math.max(...a.days.map((d) => d.mae ?? 0), 1);
  return (
    <>
      <div className="notice">
        <Activity size={17} />
        <span>
          <strong>Retrospective evaluation.</strong> Decisions 1–31 Jan →
          delivery 2 Jan–1 Feb. Forecasts selected independently at {cutoff} GMT
          on each decision day. Actuals are later observations.
        </span>
      </div>
      <section className="metrics">
        <Metric
          label="Mean absolute error"
          value={fmt(m.mae)}
          unit="MW"
          note="Typical absolute hourly miss"
          accent
        />
        <Metric
          label="Root mean squared error"
          value={fmt(m.rmse)}
          unit="MW"
          note="Gives more weight to large misses"
        />
        <Metric
          label="Forecast bias"
          value={(m.bias > 0 ? "+" : "") + fmt(m.bias)}
          unit="MW"
          note="Positive means wind was overforecast"
        />
        <Metric
          label="Weighted absolute error"
          value={fmt(m.wape, 1)}
          unit="%"
          note={`Σ |forecast − actual| / Σ actual · n=${m.n}`}
        />
      </section>
      <div className="accuracy-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <h2>Where did the forecast miss?</h2>
              <p>Daily mean absolute error · MW · Click a day to inspect</p>
            </div>
            <span className="tag">31 decisions</span>
          </div>
          <div className="daily-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={a.days}
                margin={{ left: 0, right: 16, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="#edf0ec" />
                <XAxis
                  dataKey="decisionDate"
                  tickFormatter={(v) => v.slice(-2)}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#82908a" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#82908a" }}
                  width={48}
                />
                <Tooltip
                  formatter={(v) => [`${fmt(v)} MW`, "MAE"]}
                  labelFormatter={(v) => `Decision ${shortDate(v)}`}
                />
                <Bar
                  onClick={(r) => {
                    if (r.payload?.decisionDate) onDay(r.payload.decisionDate);
                  }}
                  style={{ cursor: "pointer" }}
                  dataKey="mae"
                  fill="#3f8a76"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card coverage-card">
          <div className="tiny-label">EVALUATION COVERAGE</div>
          <div className="coverage-number">
            {fmt((100 * m.n) / a.expected, 1)}
            <span>%</span>
          </div>
          <p>
            {fmt(m.n)} of {fmt(a.expected)} expected hourly pairs
          </p>
          <div className="coverage-track">
            <span style={{ width: `${(100 * m.n) / a.expected}%` }} />
          </div>
          <dl>
            <div>
              <dt>Forecast hours</dt>
              <dd>{a.forecastHours} / 744</dd>
            </div>
            <div>
              <dt>Complete actual hours</dt>
              <dd>{a.actualHours} / 744</dd>
            </div>
            <div>
              <dt>P90 absolute error</dt>
              <dd>{fmt(m.p90)} MW</dd>
            </div>
          </dl>
          <p className="fine-print">
            Missing pairs are excluded, never filled with zero. Each hour needs
            both actual half-hours.
          </p>
        </section>
      </div>
      <section className="card">
        <div className="card-heading">
          <div>
            <h2>The shape of error across the day</h2>
            <p>
              Signed mean error by delivery hour · forecast minus actual · MW
            </p>
          </div>
          <span className="tag">Positive = overforecast</span>
        </div>
        <div className="bias-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.byHour} margin={{ right: 20 }}>
              <CartesianGrid vertical={false} stroke="#edf0ec" />
              <XAxis
                dataKey="label"
                interval={2}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#82908a" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#82908a" }}
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(v) => [`${fmt(v)} MW`, "Bias"]} />
              <ReferenceLine y={0} stroke="#879b90" />
              <Bar
                dataKey="bias"
                fill="#cf9260"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card detail-card">
        <div className="card-heading">
          <div>
            <h2>Decision-day scorecard</h2>
            <p>
              Choose a decision date to inspect its profile and hindsight
              actuals.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Decision → delivery</th>
                <th>MAE · MW</th>
                <th>RMSE · MW</th>
                <th>Bias · MW</th>
                <th>WAPE</th>
                <th>Paired hours</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {a.days.map((d) => (
                <tr key={d.decisionDate}>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => onDay(d.decisionDate)}
                    >
                      {shortDate(d.decisionDate)} → {shortDate(d.deliveryDate)}
                    </button>
                  </td>
                  <td>
                    <div className="inline-meter">
                      <span>{fmt(d.mae)}</span>
                      <i style={{ width: `${(60 * (d.mae ?? 0)) / max}px` }} />
                    </div>
                  </td>
                  <td>{fmt(d.rmse)}</td>
                  <td className={d.bias > 0 ? "over" : "under"}>
                    {d.bias > 0 ? "+" : ""}
                    {fmt(d.bias)}
                  </td>
                  <td>{fmt(d.wape, 1)}%</td>
                  <td>{d.n} / 24</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Inspect decision ${d.decisionDate}`}
                      onClick={() => onDay(d.decisionDate)}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function DataView({ o, revisions, hour, setHour, cutoff }) {
  return (
    <>
      <div className="notice">
        <Database size={17} />
        <span>
          <strong>Authentic historical data.</strong> Retrieved{" "}
          {stamp(o.meta.retrievedAt)} GMT. This is a fixed January pilot
          snapshot, not a live feed.
        </span>
      </div>
      <section className="metrics">
        <Metric
          accent
          label="Forecast observations"
          value={fmt(o.meta.forecastRows)}
          unit=""
          note="All retained publication vintages"
        />
        <Metric
          label="Wind actual observations"
          value={fmt(o.meta.actualRows)}
          unit=""
          note="FUELHH filtered to WIND"
        />
        <Metric
          label="Storage mode"
          value={o.storage === "MongoDB" ? "MongoDB" : "Snapshot"}
          unit=""
          note="Storage is reported by the backend"
        />
        <Metric
          label="Target resolution"
          value="1"
          unit="hour"
          note="Forecast-native evaluation grain"
        />
      </section>
      <section className="card detail-card">
        <div className="card-heading">
          <div>
            <h2>Forecast publication audit</h2>
            <p>
              All retained vintages for one delivery hour. Selection happens at
              or before the cutoff.
            </p>
          </div>
          <label className="inline-select">
            Delivery hour{" "}
            <select
              aria-label="Audit delivery hour"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00 GMT
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Publication · GMT</th>
                <th>Delivery start · GMT</th>
                <th>Forecast · MW</th>
                <th>At {cutoff} cutoff</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r, i) => (
                <tr key={`${r.publishTime}-${i}`}>
                  <td>{stamp(r.publishTime)}</td>
                  <td>{stamp(r.startTime)}</td>
                  <td className="strong">{fmt(r.generation)}</td>
                  <td>
                    <span
                      className={`tag ${r.publishTime === o.rows[hour].publishTime ? "selected-tag" : ""}`}
                    >
                      {r.publishTime === o.rows[hour].publishTime
                        ? "Selected"
                        : r.eligible
                          ? "Earlier eligible"
                          : "After cutoff · excluded"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card provenance">
        <h2>Source ledger</h2>
        <p>
          Only the two requested Elexon datasets contribute numerical data. No
          demand, price, weather, or other generation feed is used.
        </p>
        {o.meta.manifest.map((m, i) => (
          <div className="source-ledger" key={i}>
            <div>
              <strong>
                {m.url.includes("WINDFOR")
                  ? "WINDFOR · Forecasts"
                  : "FUELHH · Actuals"}
              </strong>
              <span>
                {fmt(m.rows)} source records before wind filtering and
                deduplication
              </span>
            </div>
            <a href={m.url} target="_blank" rel="noreferrer">
              Open source request <ArrowUpRight size={15} />
            </a>
            <code>SHA-256 {m.sha256}</code>
          </div>
        ))}
        <p className="fine-print">
          Bundled records preserve generation, delivery timestamp, and
          publication timestamp. Raw response hashes are recorded during
          ingestion; raw files can be regenerated with npm run ingest. MongoDB
          caches the seeded snapshot in process; restart after reseeding.
        </p>
        <p>
          Contains BMRS data © Elexon Limited copyright and database right
          2026. See{" "}
          <a
            href="https://bmrs.elexon.co.uk/wind-generation"
            target="_blank"
            rel="noreferrer"
          >
            Elexon data information
          </a>
          .
        </p>
      </section>
    </>
  );
}
function Method() {
  return (
    <div className="method-grid">
      <section className="card method-intro">
        <span className="tiny-label">THE DECISION CONTRACT</span>
        <h2>A forecast is only useful if you could have known it.</h2>
        <p>
          For each delivery hour on D+1, Aeris selects the latest WINDFOR record
          with publishTime at or before the chosen cutoff on decision day D.
          Later revisions are excluded, even when they would make the forecast
          look better.
        </p>
        <div className="timeline">
          <div>
            <Clock3 size={23} />
            <b>D · Decision cutoff</b>
            <span>Freeze eligible publications</span>
          </div>
          <ArrowRight />
          <div>
            <Wind size={23} />
            <b>D+1 · Delivery</b>
            <span>24 hourly forecast targets</span>
          </div>
          <ArrowRight />
          <div>
            <Activity size={23} />
            <b>After delivery</b>
            <span>Evaluate against actuals</span>
          </div>
        </div>
        <p className="fine-print">
          January 2026 is interpreted as decision dates 1–31 January, giving
          delivery dates 2 January–1 February. London is on GMT throughout this
          window. The 09:00 default is an explicit pilot operating assumption;
          confirm the utility’s venue, submission buffer, and auction schedule
          before operational use. Alternative cutoffs are analytical scenarios,
          not guaranteed market deadlines.
        </p>
      </section>
      <section className="card method-block">
        <span className="step">01</span>
        <h2>Match like with like</h2>
        <p>
          WINDFOR is hourly in the retrieved data. FUELHH is half-hourly and
          filtered to fuelType = WIND. Actual hourly MW = (first half-hour MW +
          second half-hour MW) / 2.
        </p>
        <p>
          Both half-hours must be present. Missing forecasts or actuals stay
          null, and metrics exclude unmatched hours. Forecast energy is reported
          only for a complete 24-hour day.
        </p>
        <p className="fine-print">
          Elexon’s wind forecast covers wind farms visible to the system
          operator with operational metering. Treat this as the Elexon national
          wind series, not total UK wind including unmetered embedded
          generation.
        </p>
      </section>
      <section className="card method-block">
        <span className="step">02</span>
        <h2>Quantify the miss</h2>
        <p className="formula">error = forecast − actual</p>
        <p>
          Positive error means wind was overforecast and a potential supply
          shortfall. MAE measures the typical absolute miss; RMSE emphasises
          larger misses; bias reveals systematic direction.
        </p>
        <p className="formula">WAPE = Σ |error| / Σ |actual| × 100</p>
        <p>
          WAPE avoids the instability of percentage errors in low-wind hours. A
          zero total actual returns no percentage. The P90 absolute error is the
          linearly interpolated 90th percentile.
        </p>
      </section>
      <section className="card method-block">
        <span className="step">03</span>
        <h2>Keep the risk scenario honest</h2>
        <p>
          The historical shortfall buffer is max(0, P90 of signed forecast −
          actual errors). It uses completed delivery days strictly before the
          selected decision date, with actual publication times no later than
          the cutoff.
        </p>
        <p>
          At least 48 hourly pairs are required. The lower scenario is max(0,
          forecast − buffer). This is a pooled empirical scenario, not a
          calibrated confidence interval or a guaranteed procurement
          recommendation.
        </p>
        <p className="fine-print">
          There is no pre-January error history in this scope. Adjacent hourly
          errors are correlated; observed coverage may not carry forward.
        </p>
      </section>
      <section className="card method-block">
        <span className="step">04</span>
        <h2>Understand the pilot boundary</h2>
        <p>
          The full-month accuracy view is retrospective and includes later
          actual observations. Only the selected day’s empirical buffer is
          restricted to history available at that decision.
        </p>
        <p>
          Demand, utility allocation, existing contracts, other generation,
          prices, and trading costs are outside scope. These are needed to turn
          a wind forecast into an actual purchase quantity. A national wind
          error must not be applied directly to a utility portfolio.
        </p>
        <p className="fine-print">
          The app does not place trades. Production work would add ingestion
          monitoring, portfolio mapping, access control, point-in-time actual
          revision history, and out-of-sample risk calibration.
        </p>
      </section>
      <section className="card references">
        <h2>Primary references</h2>
        <a
          href="https://bmrs.elexon.co.uk/wind-generation"
          target="_blank"
          rel="noreferrer"
        >
          Elexon · Wind generation and forecast coverage{" "}
          <ArrowUpRight size={15} />
        </a>
        <a
          href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
          target="_blank"
          rel="noreferrer"
        >
          Elexon · WINDFOR stream API <ArrowUpRight size={15} />
        </a>
        <a
          href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
          target="_blank"
          rel="noreferrer"
        >
          Elexon · FUELHH stream API <ArrowUpRight size={15} />
        </a>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
