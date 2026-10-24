import csv
import io
import pytest
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)


def test_health_and_overview():
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["backend"] == "Python / FastAPI"
    overview = client.get("/api/overview?date=2026-01-15&cutoff=09:00").json()
    assert overview["deliveryDate"] == "2026-01-16"
    assert len(overview["rows"]) == 24
    assert overview["meta"]["forecastRows"] == 18688


@pytest.mark.parametrize("query", ["date=2026-02-01", "date=invalid", "cutoff=24:00", "date=a&date=b"])
def test_bad_input_is_structured_400(query):
    response = client.get(f"/api/overview?{query}")
    assert response.status_code == 400
    assert response.json()["error"]


def test_csv_has_all_hours_and_provenance():
    response = client.get("/api/export?scope=month")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    rows = list(csv.reader(io.StringIO(response.text)))
    assert len(rows) == 745
    assert "forecast_publish_utc" in rows[0]
    assert "2026-02-01" in rows[-1][2]
    assert all(len(r) == len(rows[0]) for r in rows)


def test_revisions_include_later_excluded_vintages():
    rows = client.get("/api/revisions?date=2026-01-15&hour=12").json()
    assert any(r["eligible"] for r in rows)
    assert any(not r["eligible"] for r in rows)
    assert client.get("/api/revisions?hour=24").status_code == 400


def test_unknown_api_is_json_404():
    response = client.get("/api/not-real")
    assert response.status_code == 404
    assert response.json()["error"]
