export const DAY = 86400000;
export function cutoffFor(date, time = "09:00") {
  if (!/^2026-01-(0[1-9]|[12]\d|3[01])$/.test(date))
    throw new Error("Decision date must be in January 2026");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Cutoff must be HH:mm");
  return new Date(`${date}T${time}:00Z`).toISOString();
}
export function quantile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos),
    hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
export function metrics(rows) {
  const paired = rows.filter((r) => r.forecast !== null && r.actual !== null);
  if (!paired.length)
    return { n: 0, mae: null, rmse: null, bias: null, wape: null, p90: null };
  const errors = paired.map((r) => r.forecast - r.actual),
    n = errors.length;
  const sumActual = paired.reduce((s, r) => s + Math.abs(r.actual), 0);
  return {
    n,
    mae: errors.reduce((s, x) => s + Math.abs(x), 0) / n,
    rmse: Math.sqrt(errors.reduce((s, x) => s + x * x, 0) / n),
    bias: errors.reduce((s, x) => s + x, 0) / n,
    wape: sumActual
      ? (100 * errors.reduce((s, x) => s + Math.abs(x), 0)) / sumActual
      : null,
    p90: quantile(errors.map(Math.abs), 0.9),
  };
}
export function makeEngine(snapshot) {
  const forecasts = new Map(),
    actuals = new Map();
  for (const row of snapshot.forecasts) {
    if (!forecasts.has(row.startTime)) forecasts.set(row.startTime, []);
    forecasts.get(row.startTime).push(row);
  }
  for (const list of forecasts.values())
    list.sort((a, b) => a.publishTime.localeCompare(b.publishTime));
  // Latest retrieved actual revision is the retrospective evaluation reference.
  for (const r of snapshot.actuals)
    if (
      !actuals.has(r.startTime) ||
      actuals.get(r.startTime).publishTime < r.publishTime
    )
      actuals.set(r.startTime, r);
  function day(date, time = "09:00") {
    const cutoff = cutoffFor(date, time),
      deliveryStart = new Date(Date.parse(`${date}T00:00:00Z`) + DAY);
    const rows = Array.from({ length: 24 }, (_, hour) => {
      const startTime = new Date(+deliveryStart + hour * 3600000).toISOString();
      const eligible = (forecasts.get(startTime) || []).filter(
        (r) => r.publishTime <= cutoff,
      );
      const selected = eligible.at(-1),
        a = actuals.get(startTime),
        b = actuals.get(
          new Date(Date.parse(startTime) + 1800000).toISOString(),
        );
      const actual = a && b ? (a.generation + b.generation) / 2 : null;
      return {
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        startTime,
        forecast: selected?.generation ?? null,
        actual,
        publishTime: selected?.publishTime ?? null,
        actualPublishTime:
          a && b ? [a.publishTime, b.publishTime].sort().at(-1) : null,
        leadHours: selected
          ? (Date.parse(startTime) - Date.parse(selected.publishTime)) / 3600000
          : null,
        error:
          selected && actual !== null ? selected.generation - actual : null,
      };
    });
    return {
      decisionDate: date,
      cutoff,
      deliveryDate: deliveryStart.toISOString().slice(0, 10),
      rows,
    };
  }
  function month(time = "09:00") {
    const days = Array.from({ length: 31 }, (_, i) =>
      day(`2026-01-${String(i + 1).padStart(2, "0")}`, time),
    );
    const rows = days.flatMap((d) =>
      d.rows.map((r) => ({
        ...r,
        decisionDate: d.decisionDate,
        deliveryDate: d.deliveryDate,
      })),
    );
    return {
      days: days.map((d) => ({
        decisionDate: d.decisionDate,
        deliveryDate: d.deliveryDate,
        ...metrics(d.rows),
        forecastHours: d.rows.filter((r) => r.forecast !== null).length,
      })),
      metrics: metrics(rows),
      expected: 744,
      forecastHours: rows.filter((r) => r.forecast !== null).length,
      actualHours: rows.filter((r) => r.actual !== null).length,
      byHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${String(hour).padStart(2, "0")}:00`,
        ...metrics(rows.filter((r) => r.hour === hour)),
      })),
      rows,
    };
  }
  function overview(date, time = "09:00") {
    const selected = day(date, time),
      monthly = month(time);
    // Completed prior delivery days only; also enforce actual publication availability.
    const history = monthly.rows.filter(
      (r) =>
        r.deliveryDate < date &&
        r.actualPublishTime &&
        r.actualPublishTime <= selected.cutoff &&
        r.forecast !== null &&
        r.actual !== null,
    );
    const enough = history.length >= 48;
    const buffer = enough
      ? Math.max(
          0,
          quantile(
            history.map((r) => r.error),
            0.9,
          ),
        )
      : null;
    const available = selected.rows.filter((r) => r.forecast !== null),
      complete = available.length === 24;
    const values = available.map((r) => r.forecast);
    return {
      ...selected,
      summary: {
        forecastHours: available.length,
        pairedHours: metrics(selected.rows).n,
        mean: values.length
          ? values.reduce((s, x) => s + x, 0) / values.length
          : null,
        energy: complete ? values.reduce((s, x) => s + x, 0) : null,
        peak: values.length ? Math.max(...values) : null,
        latestPublish:
          available
            .map((r) => r.publishTime)
            .sort()
            .at(-1) ?? null,
        earliestPublish: available.map((r) => r.publishTime).sort()[0] ?? null,
        maxAgeHours: available.length
          ? Math.max(
              ...available.map(
                (r) =>
                  (Date.parse(selected.cutoff) - Date.parse(r.publishTime)) /
                  3600000,
              ),
            )
          : null,
      },
      risk: {
        buffer,
        n: history.length,
        minimumSamples: 48,
        metrics: metrics(history),
        from: history[0]?.deliveryDate ?? null,
        to: history.at(-1)?.deliveryDate ?? null,
      },
      rows: selected.rows.map((r) => ({
        ...r,
        conservative:
          r.forecast !== null && buffer !== null
            ? Math.max(0, r.forecast - buffer)
            : null,
      })),
      meta: {
        ...snapshot.meta,
        forecastRows: snapshot.forecasts.length,
        actualRows: snapshot.actuals.length,
      },
    };
  }
  function revisions(date, time, hour = 12) {
    const d = day(date, time),
      target = d.rows[hour];
    return (forecasts.get(target.startTime) || []).map((r) => ({
      ...r,
      eligible: r.publishTime <= d.cutoff,
    }));
  }
  return { day, month, overview, revisions };
}
