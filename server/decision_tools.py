"""Decision-policy comparison, chronological risk validation, and as-of briefs."""
import hashlib
import json
from server.analytics import cutoff_for, metrics, quantile


def validate_confidence(confidence):
    if isinstance(confidence, bool) or confidence not in (80, 90, 95):
        raise ValueError("Confidence must be 80, 90, or 95")


class DecisionTools:
    def __init__(self, analysis):
        self.analysis = analysis

    def risk(self, date, cutoff, confidence=90):
        validate_confidence(confidence)
        history = self.analysis.historical_rows(date, cutoff)
        return dict(confidence=confidence, trainingN=len(history), minimumSamples=48,
                    bufferMW=max(0, quantile([r["error"] for r in history], confidence / 100)) if len(history) >= 48 else None,
                    trainingFrom=history[0]["deliveryDate"] if history else None,
                    trainingTo=history[-1]["deliveryDate"] if history else None)

    def compare(self, date, cutoff, earlier):
        cutoff_for(date, earlier)
        cutoff_for(date, cutoff)
        if earlier >= cutoff:
            raise ValueError("Earlier cutoff must be strictly before the selected cutoff")
        before, after = self.analysis.day(date, earlier), self.analysis.day(date, cutoff)
        rows = []
        for left, right in zip(before["rows"], after["rows"]):
            change = right["forecast"] - left["forecast"] if left["forecast"] is not None and right["forecast"] is not None else None
            rows.append(dict(hour=right["hour"], label=right["label"], startTime=right["startTime"],
                             earlierForecast=left["forecast"], laterForecast=right["forecast"], revisionMW=change,
                             earlierPublishTime=left["publishTime"], laterPublishTime=right["publishTime"]))
        paired = [r for r in rows if r["revisionMW"] is not None]
        # Evaluate both policies on exactly the same target/actual cohort.
        left_month = {r["startTime"]: r for r in self.analysis.month(earlier)["rows"]}
        cohort = [(left_month[r["startTime"]], r) for r in self.analysis.month(cutoff)["rows"]
                  if r["forecast"] is not None and r["actual"] is not None
                  and left_month[r["startTime"]]["forecast"] is not None]
        earlier_metrics = metrics([left for left, _ in cohort])
        later_metrics = metrics([right for _, right in cohort])
        return dict(earlier=earlier, later=cutoff, rows=rows, pairedHours=len(paired),
                    changedHours=sum(r["revisionMW"] != 0 for r in paired),
                    energyRevisionMWh=sum(r["revisionMW"] for r in paired) if len(paired) == 24 else None,
                    largestRevisions=sorted([r for r in paired if r["revisionMW"] != 0],
                                            key=lambda r: abs(r["revisionMW"]), reverse=True)[:3],
                    hindsight=dict(n=len(cohort), expected=744, earlier=earlier_metrics, later=later_metrics,
                                   maeDeltaMW=later_metrics["mae"] - earlier_metrics["mae"] if cohort else None))

    def backtest(self, cutoff, confidence=90):
        validate_confidence(confidence)
        days, total_n, breaches, discounted, shortfall = [], 0, 0, 0, 0
        for i in range(1, 32):
            date = f"2026-01-{i:02d}"
            risk = self.risk(date, cutoff, confidence)
            day = self.analysis.day(date, cutoff)
            paired = [r for r in day["rows"] if r["forecast"] is not None and r["actual"] is not None]
            usable = risk["bufferMW"] is not None and bool(paired)
            count, missed, allowance, residual = 0, 0, 0, 0
            if usable:
                for row in paired:
                    lower = max(0, row["forecast"] - risk["bufferMW"])
                    count += 1
                    missed += row["actual"] < lower
                    allowance += row["forecast"] - lower
                    residual += max(0, lower - row["actual"])  # MW × 1h = MWh
            total_n += count
            breaches += missed
            discounted += allowance
            shortfall += residual
            days.append(dict(decisionDate=date, deliveryDate=day["deliveryDate"], **risk,
                             evaluated=usable, n=count, breaches=missed,
                             coverage=100 * (count - missed) / count if count else None,
                             discountedWindMWh=allowance if usable else None,
                             uncoveredMWh=residual if usable else None))
        return dict(confidence=confidence, days=days, n=total_n, expected=744,
                    evaluatedDays=sum(d["evaluated"] for d in days),
                    excludedDays=sum(not d["evaluated"] for d in days),
                    breaches=breaches, observedCoverage=100 * (total_n - breaches) / total_n if total_n else None,
                    discountedWindMWh=discounted if total_n else None,
                    meanAllowanceMW=discounted / total_n if total_n else None,
                    uncoveredMWh=shortfall if total_n else None)

    def lab(self, date, cutoff, earlier="07:00", confidence=90):
        monthly = self.analysis.month(cutoff)
        grid = [dict(decisionDate=f"2026-01-{i:02d}",
                     cells=[dict(hour=r["hour"], errorMW=r["error"], startTime=r["startTime"])
                            for r in monthly["rows"] if r["decisionDate"] == f"2026-01-{i:02d}"])
                for i in range(1, 32)]
        errors = [abs(r["error"]) for r in monthly["rows"] if r["error"] is not None]
        return dict(decisionDate=date, cutoff=cutoff, comparison=self.compare(date, cutoff, earlier),
                    selectedRisk=self.risk(date, cutoff, confidence), backtest=self.backtest(cutoff, confidence),
                    heatmap=dict(days=grid, scaleMW=max(1, max(errors)) if errors else 1))

    def brief(self, date, cutoff, earlier="07:00", confidence=90):
        selected = self.analysis.overview(date, cutoff)
        risk = self.risk(date, cutoff, confidence)
        comparison = self.compare(date, cutoff, earlier)
        # Deliberately enumerate fields: never include selected-day hindsight actuals.
        brief = dict(schemaVersion=1, title="Aeris decision brief", decisionDate=date, deliveryDate=selected["deliveryDate"],
                     cutoff=selected["cutoff"], earlierCutoff=earlier,
                     summary={k: v for k, v in selected["summary"].items() if k != "pairedHours"}, historicalRisk=risk,
                     revisionSummary=dict(commonForecastHours=comparison["pairedHours"], changedHours=comparison["changedHours"],
                                          energyRevisionMWh=comparison["energyRevisionMWh"]),
                     rows=[dict(startTime=r["startTime"], label=r["label"], forecastMW=r["forecast"],
                                publishTime=r["publishTime"],
                                lowerScenarioMW=max(0, r["forecast"] - risk["bufferMW"])
                                if r["forecast"] is not None and risk["bufferMW"] is not None else None)
                           for r in selected["rows"]],
                     provenance=dict(retrievedAt=self.analysis.snapshot["meta"]["retrievedAt"],
                                     manifest=self.analysis.snapshot["meta"]["manifest"]),
                     notes=["Only publications available by the decision cutoff are selected; no delivery-day actual readings are included.",
                            "The lower wind scenario uses completed earlier delivery days only, with actual publications available before this decision.",
                            "Empirical percentile, not a calibrated prediction interval or guarantee. The default cutoff is a desk assumption.",
                            "National Elexon wind alone cannot determine a utility's purchases; demand, allocation and existing contracts are outside scope."])
        brief["briefId"] = hashlib.sha256(json.dumps(brief, sort_keys=True).encode()).hexdigest()[:16]
        return brief
