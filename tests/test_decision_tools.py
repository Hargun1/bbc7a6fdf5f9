from copy import deepcopy
import json
import pytest
from fastapi.testclient import TestClient
from server.analytics import Analysis
from server.app import app
from server.brief import render_brief
from server.decision_tools import DecisionTools
from server.repository import ROOT


def sample():
    data = dict(meta=dict(retrievedAt="2026-02-02T00:00:00.000Z", manifest=[dict(url="https://example.test/source", sha256="abc")]),
                forecasts=[], actuals=[])
    for day in (2, 3, 5):
        for hour in range(24):
            target = f"2026-01-{day:02d}T{hour:02d}:00:00.000Z"
            for publication, generation in (("06:00", 118), ("08:00", 120)):
                data["forecasts"].append(dict(startTime=target, publishTime=f"2026-01-{day-1:02d}T{publication}:00.000Z", generation=generation))
            for minute in ("00", "30"):
                data["actuals"].append(dict(startTime=f"2026-01-{day:02d}T{hour:02d}:{minute}:00.000Z",
                                            publishTime=f"2026-01-{day:02d}T23:59:00.000Z", generation=90 if day == 5 else 100))
    return data


def test_revision_is_later_minus_earlier_and_energy_requires_all_hours():
    tools = DecisionTools(Analysis(sample()))
    comparison = tools.compare("2026-01-01", "09:00", "07:00")
    assert comparison["pairedHours"] == 24
    assert comparison["changedHours"] == 24
    assert comparison["energyRevisionMWh"] == 48
    assert all(r["revisionMW"] == 2 for r in comparison["rows"])
    assert all(r["laterPublishTime"] <= "2026-01-01T09:00:00.000Z" for r in comparison["rows"])
    assert all("actual" not in r for r in comparison["rows"])


def test_policy_metrics_use_same_cohort_when_earlier_forecast_is_missing():
    data = sample()
    data["forecasts"] = [r for r in data["forecasts"]
                         if not (r["startTime"] == "2026-01-02T00:00:00.000Z" and "T06:00" in r["publishTime"])]
    comparison = DecisionTools(Analysis(data)).compare("2026-01-01", "09:00", "07:00")
    assert comparison["pairedHours"] == 23
    assert comparison["energyRevisionMWh"] is None
    hindsight = comparison["hindsight"]
    assert hindsight["earlier"]["n"] == hindsight["later"]["n"] == hindsight["n"] == 71
    assert hindsight["maeDeltaMW"] == pytest.approx(2)


def test_unchanged_publication_window_reports_zero_change_not_missing_data():
    comparison = DecisionTools(Analysis(sample())).compare("2026-01-01", "09:20", "09:00")
    assert comparison["pairedHours"] == 24
    assert comparison["changedHours"] == 0
    assert comparison["energyRevisionMWh"] == 0
    assert comparison["largestRevisions"] == []
    assert comparison["hindsight"]["maeDeltaMW"] == 0


@pytest.mark.parametrize("earlier", ["09:00", "09:01", "25:00", "bad"])
def test_invalid_comparison_policy(earlier):
    with pytest.raises(ValueError):
        DecisionTools(Analysis(sample())).compare("2026-01-01", "09:00", earlier)


def test_walk_forward_uses_prior_days_and_measures_shortfall_energy():
    replay = DecisionTools(Analysis(sample())).backtest("09:00", 90)
    selected = replay["days"][3]
    assert selected["trainingN"] == 48
    assert selected["trainingTo"] == "2026-01-03"
    assert selected["bufferMW"] == 20
    assert selected["n"] == 24 and selected["breaches"] == 24
    assert selected["coverage"] == 0
    assert selected["uncoveredMWh"] == 240  # 10 MW × 24 one-hour targets
    assert selected["discountedWindMWh"] == 480
    assert replay["n"] == 24 and replay["meanAllowanceMW"] == 20
    assert all(d["trainingTo"] < d["decisionDate"] for d in replay["days"] if d["trainingTo"])


def test_future_actuals_cannot_change_selected_risk_or_brief():
    data = sample()
    baseline = DecisionTools(Analysis(data))
    risk = baseline.risk("2026-01-04", "09:00")
    brief = baseline.brief("2026-01-04", "09:00")
    changed = deepcopy(data)
    changed["actuals"] = [r for r in changed["actuals"] if r["startTime"] < "2026-01-04"]
    later = DecisionTools(Analysis(changed))
    assert later.risk("2026-01-04", "09:00") == risk
    assert later.brief("2026-01-04", "09:00") == brief


def test_unavailable_actual_publication_is_excluded_from_risk_training():
    data = sample()
    data["actuals"][0]["publishTime"] = "2026-01-05T00:00:00.000Z"
    risk = DecisionTools(Analysis(data)).risk("2026-01-04", "09:00")
    assert risk["trainingN"] == 47
    assert risk["bufferMW"] is None


def test_no_history_does_not_create_a_zero_buffer():
    tools = DecisionTools(Analysis(sample()))
    risk = tools.risk("2026-01-01", "09:00")
    assert risk["trainingN"] == 0
    assert risk["bufferMW"] is None


def test_lower_wind_scenario_is_clipped_and_zero_actual_meets_zero_scenario():
    data = sample()
    for row in data["forecasts"]:
        if row["startTime"].startswith("2026-01-05"):
            row["generation"] = 0
    for row in data["actuals"]:
        if row["startTime"].startswith("2026-01-05"):
            row["generation"] = 0
    day = DecisionTools(Analysis(data)).backtest("09:00")["days"][3]
    assert day["coverage"] == 100
    assert day["discountedWindMWh"] == 0
    assert day["uncoveredMWh"] == 0


def test_negative_historical_overforecast_quantile_is_floored_at_zero():
    data = sample()
    for row in data["actuals"]:
        if row["startTime"] < "2026-01-04":
            row["generation"] = 200
    assert DecisionTools(Analysis(data)).risk("2026-01-04", "09:00")["bufferMW"] == 0


def test_real_replay_reproduces_coverage_and_exposes_cold_start():
    data = json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8"))
    tools = DecisionTools(Analysis(data))
    replay = tools.backtest("09:00", 90)
    assert replay["n"] == 672
    assert replay["evaluatedDays"] == 28 and replay["excludedDays"] == 3
    assert replay["breaches"] == 82
    assert replay["observedCoverage"] == pytest.approx(87.79761904761905)
    assert replay["uncoveredMWh"] == pytest.approx(119419.5)
    replay95 = tools.backtest("09:00", 95)
    assert replay95["observedCoverage"] >= replay["observedCoverage"]
    assert replay95["discountedWindMWh"] >= replay["discountedWindMWh"]


def test_brief_has_no_hindsight_values_and_has_stable_id():
    tools = DecisionTools(Analysis(sample()))
    brief = tools.brief("2026-01-04", "09:00")
    def check(value):
        if isinstance(value, dict):
            assert not {"actual", "error", "pairedHours", "hindsight", "observedCoverage"}.intersection(value)
            for item in value.values(): check(item)
        elif isinstance(value, list):
            for item in value: check(item)
    check(brief)
    assert brief["briefId"] == tools.brief("2026-01-04", "09:00")["briefId"]
    assert brief["briefId"] != tools.brief("2026-01-04", "09:00", confidence=95)["briefId"]


def test_brief_escapes_untrusted_text():
    brief = DecisionTools(Analysis(sample())).brief("2026-01-04", "09:00")
    brief["notes"].append('<img src=x onerror="bad()">')
    html = render_brief(brief)
    assert "<img" not in html
    assert "&lt;img" in html
    assert "<script" not in html


client = TestClient(app)


def test_lab_api_and_heatmap_shape():
    response = client.get("/api/lab?date=2026-01-15&cutoff=09:00&earlier=07:00&confidence=90")
    assert response.status_code == 200
    result = response.json()
    assert result["comparison"]["hindsight"]["n"] == 744
    assert result["selectedRisk"]["trainingN"] == 312
    assert len(result["heatmap"]["days"]) == 31
    assert all(len(d["cells"]) == 24 for d in result["heatmap"]["days"])


@pytest.mark.parametrize("query", ["confidence=99", "confidence=90.0", "earlier=09:50", "earlier=09:00", "confidence=80&confidence=95", "cutoff=25:00"])
def test_lab_rejects_invalid_policy_inputs(query):
    response = client.get(f"/api/lab?{query}")
    assert response.status_code == 400
    assert response.json()["error"]


def test_brief_api_download_and_machine_readable_record():
    response = client.get("/api/brief?date=2026-01-15&confidence=95")
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    assert "p95.html" in response.headers["content-disposition"]
    assert "default-src 'none'" in response.headers["content-security-policy"]
    assert "<script" not in response.text
    record = client.get("/api/brief?date=2026-01-15&confidence=95&format=json").json()
    assert record["historicalRisk"]["confidence"] == 95
    assert len(record["rows"]) == 24
    assert client.get("/api/brief?format=pdf").status_code == 400
