"""Pure, point-in-time wind forecast analysis. All power values are MW."""
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import math
import re


def timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def cutoff_for(date: str, time: str = "09:00") -> str:
    if not isinstance(date, str) or not re.fullmatch(r"2026-01-(0[1-9]|[12]\d|3[01])", date):
        raise ValueError("Decision date must be in January 2026")
    if not isinstance(time, str) or not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", time):
        raise ValueError("Cutoff must be HH:mm")
    return iso(timestamp(f"{date}T{time}:00Z"))


def quantile(values, probability):
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * probability
    lo, hi = math.floor(position), math.ceil(position)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (position - lo)


def metrics(rows):
    paired = [r for r in rows if r["forecast"] is not None and r["actual"] is not None]
    if not paired:
        return dict(n=0, mae=None, rmse=None, bias=None, wape=None, p90=None)
    errors = [r["forecast"] - r["actual"] for r in paired]
    absolute = [abs(e) for e in errors]
    n = len(errors)
    actual_sum = sum(abs(r["actual"]) for r in paired)
    return dict(n=n, mae=sum(absolute) / n,
                rmse=math.sqrt(sum(e * e for e in errors) / n),
                bias=sum(errors) / n,
                wape=100 * sum(absolute) / actual_sum if actual_sum else None,
                p90=quantile(absolute, .9))


class Analysis:
    def __init__(self, snapshot):
        self.snapshot = snapshot
        self.forecasts = {}
        self.actuals = {}
        for row in snapshot["forecasts"]:
            self.forecasts.setdefault(row["startTime"], []).append(row)
        for rows in self.forecasts.values():
            rows.sort(key=lambda r: r["publishTime"])
        for row in snapshot["actuals"]:
            prior = self.actuals.get(row["startTime"])
            if prior is None or prior["publishTime"] < row["publishTime"]:
                self.actuals[row["startTime"]] = row

    def day(self, date, time="09:00"):
        cutoff = cutoff_for(date, time)
        delivery = timestamp(f"{date}T00:00:00Z") + timedelta(days=1)
        rows = []
        for hour in range(24):
            start = delivery + timedelta(hours=hour)
            target = iso(start)
            eligible = [r for r in self.forecasts.get(target, []) if r["publishTime"] <= cutoff]
            selected = eligible[-1] if eligible else None
            first = self.actuals.get(target)
            second = self.actuals.get(iso(start + timedelta(minutes=30)))
            actual = (first["generation"] + second["generation"]) / 2 if first and second else None
            forecast = selected["generation"] if selected else None
            rows.append(dict(hour=hour, label=f"{hour:02d}:00", startTime=target,
                             forecast=forecast, actual=actual,
                             publishTime=selected["publishTime"] if selected else None,
                             actualPublishTime=max(first["publishTime"], second["publishTime"]) if first and second else None,
                             leadHours=(start - timestamp(selected["publishTime"])).total_seconds() / 3600 if selected else None,
                             error=forecast - actual if forecast is not None and actual is not None else None))
        return dict(decisionDate=date, cutoff=cutoff, deliveryDate=delivery.date().isoformat(), rows=rows)

    @lru_cache(maxsize=32)
    def month(self, time="09:00"):
        days = [self.day(f"2026-01-{i:02d}", time) for i in range(1, 32)]
        rows = [dict(r, decisionDate=d["decisionDate"], deliveryDate=d["deliveryDate"])
                for d in days for r in d["rows"]]
        return dict(days=[dict(decisionDate=d["decisionDate"], deliveryDate=d["deliveryDate"],
                               **metrics(d["rows"]), forecastHours=sum(r["forecast"] is not None for r in d["rows"]))
                          for d in days],
                    metrics=metrics(rows), expected=744,
                    forecastHours=sum(r["forecast"] is not None for r in rows),
                    actualHours=sum(r["actual"] is not None for r in rows),
                    byHour=[dict(hour=h, label=f"{h:02d}:00", **metrics([r for r in rows if r["hour"] == h]))
                            for h in range(24)], rows=rows)

    def overview(self, date, time="09:00"):
        selected = self.day(date, time)
        history = [r for r in self.month(time)["rows"]
                   if r["deliveryDate"] < date and r["actualPublishTime"]
                   and r["actualPublishTime"] <= selected["cutoff"]
                   and r["forecast"] is not None and r["actual"] is not None]
        buffer = max(0, quantile([r["error"] for r in history], .9)) if len(history) >= 48 else None
        available = [r for r in selected["rows"] if r["forecast"] is not None]
        values = [r["forecast"] for r in available]
        publications = sorted(r["publishTime"] for r in available)
        summary = dict(forecastHours=len(available), pairedHours=metrics(selected["rows"])["n"],
                       mean=sum(values) / len(values) if values else None,
                       energy=sum(values) if len(values) == 24 else None,
                       peak=max(values) if values else None,
                       latestPublish=publications[-1] if publications else None,
                       earliestPublish=publications[0] if publications else None,
                       maxAgeHours=max((timestamp(selected["cutoff"]) - timestamp(r["publishTime"])).total_seconds() / 3600
                                       for r in available) if available else None)
        return dict(selected, summary=summary,
                    risk=dict(buffer=buffer, n=len(history), minimumSamples=48, metrics=metrics(history),
                              **{"from": history[0]["deliveryDate"] if history else None,
                                 "to": history[-1]["deliveryDate"] if history else None}),
                    rows=[dict(r, conservative=max(0, r["forecast"] - buffer)
                               if r["forecast"] is not None and buffer is not None else None)
                          for r in selected["rows"]],
                    meta=dict(self.snapshot["meta"], forecastRows=len(self.snapshot["forecasts"]),
                              actualRows=len(self.snapshot["actuals"])))

    def revisions(self, date, time="09:00", hour=12):
        day = self.day(date, time)
        return [dict(r, eligible=r["publishTime"] <= day["cutoff"])
                for r in self.forecasts.get(day["rows"][hour]["startTime"], [])]
