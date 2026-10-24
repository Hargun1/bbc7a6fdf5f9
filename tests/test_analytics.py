from copy import deepcopy
import json
import math
import pytest
from server.analytics import Analysis, cutoff_for, metrics, quantile
from server.repository import ROOT
from scripts.ingest import normalize


def fixture():
    return {"meta": {}, "forecasts": [
        {"startTime": "2026-01-02T00:00:00.000Z", "publishTime": f"2026-01-01T{time}:00.000Z", "generation": value}
        for time, value in [("07:30", 100), ("09:00", 110), ("09:01", 9999)]],
        "actuals": [{"startTime": f"2026-01-02T00:{minute}:00.000Z", "publishTime": "2026-01-02T01:00:00.000Z", "generation": value}
                    for minute, value in [("00", 80), ("30", 100)]]}


def test_cutoff_includes_equal_publication_and_excludes_later():
    row = Analysis(fixture()).day("2026-01-01")["rows"][0]
    assert row["forecast"] == 110
    assert row["publishTime"] == "2026-01-01T09:00:00.000Z"


def test_actual_is_mean_of_two_half_hours():
    row = Analysis(fixture()).day("2026-01-01")["rows"][0]
    assert row["actual"] == 90
    assert row["error"] == 20


def test_missing_half_hour_stays_null():
    data = fixture()
    data["actuals"].pop()
    rows = Analysis(data).day("2026-01-01")["rows"]
    assert rows[0]["actual"] is None
    assert metrics(rows)["n"] == 0


def test_zero_is_valid_and_zero_wape_denominator_is_null():
    data = fixture()
    for row in data["forecasts"] + data["actuals"]:
        row["generation"] = 0
    result = metrics(Analysis(data).day("2026-01-01")["rows"])
    assert result["n"] == 1
    assert result["mae"] == 0
    assert result["wape"] is None


def test_metrics_sign_units_and_pair_exclusion():
    result = metrics([dict(forecast=110, actual=100), dict(forecast=80, actual=100), dict(forecast=None, actual=999)])
    assert result["n"] == 2
    assert result["mae"] == 15
    assert result["bias"] == -5
    assert result["rmse"] == math.sqrt(250)
    assert result["wape"] == 15


def test_empty_metrics_and_linear_percentile():
    assert metrics([])["mae"] is None
    assert quantile([], .9) is None
    assert quantile([0, 10], .9) == 9


def test_decision_window_includes_february_delivery():
    analysis = Analysis(fixture())
    assert analysis.day("2026-01-31")["deliveryDate"] == "2026-02-01"
    assert analysis.month()["expected"] == 744


@pytest.mark.parametrize("date", ["2026-02-01", "2026-01-32", "2026-01-00", "bad"])
def test_invalid_date(date):
    with pytest.raises(ValueError):
        cutoff_for(date)


@pytest.mark.parametrize("time", ["24:00", "09:60", "9:00", None])
def test_invalid_cutoff(time):
    with pytest.raises(ValueError):
        cutoff_for("2026-01-01", time)


def test_partial_day_cannot_report_full_day_energy():
    assert Analysis(fixture()).overview("2026-01-01")["summary"]["energy"] is None


def test_risk_minimum_and_publication_eligibility():
    data = dict(meta={}, forecasts=[], actuals=[])
    for day in (2, 3):
        for hour in range(24):
            target = f"2026-01-{day:02d}T{hour:02d}:00:00.000Z"
            data["forecasts"].append(dict(startTime=target, publishTime=f"2026-01-{day-1:02d}T07:30:00.000Z", generation=120))
            for minute in ("00", "30"):
                data["actuals"].append(dict(startTime=f"2026-01-{day:02d}T{hour:02d}:{minute}:00.000Z",
                                            publishTime=f"2026-01-{day:02d}T23:59:00.000Z", generation=100))
    assert Analysis(data).overview("2026-01-03")["risk"]["buffer"] is None
    assert Analysis(data).overview("2026-01-04")["risk"]["buffer"] == 20
    data["actuals"][0]["publishTime"] = "2026-01-05T00:00:00.000Z"
    assert Analysis(data).overview("2026-01-04")["risk"]["buffer"] is None


def test_real_snapshot_is_causal_and_reproduces_pilot_results():
    snapshot = json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8"))
    analysis = Analysis(snapshot)
    for time in ("09:00", "09:20", "09:50", "15:00"):
        month = analysis.month(time)
        assert len(month["rows"]) == 744
        for row in month["rows"]:
            if row["forecast"] is not None:
                assert row["publishTime"] <= cutoff_for(row["decisionDate"], time)
        for day in ("2026-01-01", "2026-01-15", "2026-01-31"):
            overview = analysis.overview(day, time)
            if overview["risk"]["to"]:
                assert overview["risk"]["to"] < day
            if overview["summary"]["forecastHours"] == 24:
                assert overview["summary"]["energy"] == sum(r["forecast"] for r in overview["rows"])
    result = analysis.month()["metrics"]
    assert result["n"] == 744
    assert result["mae"] == pytest.approx(2038.9126344086021)
    assert result["rmse"] == pytest.approx(2504.758652899355)
    assert result["bias"] == pytest.approx(1747.8870967741937)
    assert analysis.overview("2026-01-01")["risk"]["buffer"] is None


def test_ingestion_deduplicates_and_rejects_conflicts():
    row = dict(fixture()["forecasts"][0], fuelType="WIND")
    assert len(normalize([row, row], True)) == 1
    assert normalize([dict(row, fuelType="GAS")], True) == []
    with pytest.raises(ValueError, match="Conflicting duplicate"):
        normalize([row, dict(row, generation=101)])


@pytest.mark.parametrize("value", [None, True, -1, float("nan")])
def test_ingestion_rejects_invalid_generation(value):
    with pytest.raises(ValueError):
        normalize([dict(fixture()["forecasts"][0], generation=value)])
