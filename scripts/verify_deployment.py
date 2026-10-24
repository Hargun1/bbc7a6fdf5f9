"""Exercise the deployed Python API against the local reference calculation."""
import json
import math
import os
import time
from urllib.request import urlopen
from server.analytics import Analysis
from server.repository import ROOT


def main():
    base = os.getenv("TEST_BASE_URL", "http://127.0.0.1:3001").rstrip("/")
    def get(path):
        with urlopen(base + path, timeout=10) as response:
            return json.load(response)
    for attempt in range(45):
        try:
            health = get("/api/health")
            break
        except Exception:
            if attempt == 44:
                raise
            time.sleep(2)
    assert health["backend"] == "Python / FastAPI"
    if os.getenv("REQUIRE_MONGO", "1") == "1":
        assert health["storage"] == "MongoDB", "Expected the real MongoDB-backed Compose stack"
    reference = json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8"))
    expected = Analysis(reference).month()["metrics"]
    actual = get("/api/accuracy")["metrics"]
    for key, value in expected.items():
        assert math.isclose(actual[key], value, rel_tol=1e-12), key
    overview = get("/api/overview?date=2026-01-15")
    assert overview["meta"]["forecastRows"] == len(reference["forecasts"])
    assert overview["meta"]["actualRows"] == len(reference["actuals"])
    assert len(overview["rows"]) == 24
    with urlopen(base, timeout=10) as response:
        assert response.status == 200 and "Aeris" in response.read().decode()
    print(f"PASS: React + Python deployment, {health['storage']}, exact snapshot metric parity.")


if __name__ == "__main__":
    main()
