"""Acquire only the two requested Elexon streams; replace data atomically."""
from datetime import datetime, timezone
import hashlib
import json
import math
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from server.analytics import timestamp, iso
from server.repository import ROOT


def normalize(rows, actual=False):
    unique = {}
    for row in rows:
        if actual and row.get("fuelType") != "WIND":
            continue
        value = row["generation"]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError("Invalid Elexon generation")
        normalized = dict(startTime=iso(timestamp(row["startTime"])),
                          publishTime=iso(timestamp(row["publishTime"])), generation=value)
        key = normalized["startTime"], normalized["publishTime"]
        if key in unique and unique[key]["generation"] != value:
            raise ValueError(f"Conflicting duplicate {key}")
        unique[key] = normalized
    return sorted(unique.values(), key=lambda r: (r["startTime"], r["publishTime"]))


def main():
    manifest = []
    raw_dir = ROOT / "data/raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    def download(dataset, params):
        url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/{dataset}/stream?{urlencode(params)}"
        for attempt in range(4):
            try:
                with urlopen(Request(url, headers={"Accept": "application/json"}), timeout=90) as response:
                    raw = response.read()
                rows = json.loads(raw)
                if not isinstance(rows, list) or not rows:
                    raise ValueError("Empty or invalid source response")
                manifest.append(dict(url=url, rows=len(rows), sha256=hashlib.sha256(raw).hexdigest()))
                (raw_dir / f"{dataset}-{len(manifest)}.json").write_bytes(raw)
                return rows
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(.8 * 2 ** attempt)

    forecasts = download("WINDFOR", dict(publishDateTimeFrom="2025-12-31T00:00:00Z", publishDateTimeTo="2026-02-01T00:00:00Z"))
    actuals = download("FUELHH", dict(settlementDateFrom="2026-01-01", settlementDateTo="2026-02-01"))
    snapshot = dict(meta=dict(retrievedAt=iso(datetime.now(timezone.utc)), decisionFrom="2026-01-01", decisionTo="2026-01-31",
                              source="Elexon Insights", manifest=manifest),
                    forecasts=normalize(forecasts), actuals=normalize(actuals, True))
    temporary = ROOT / "data/snapshot.json.tmp"
    temporary.write_text(json.dumps(snapshot, separators=(",", ":")), encoding="utf-8")
    temporary.replace(ROOT / "data/snapshot.json")
    print(f"Saved {len(snapshot['forecasts'])} forecasts and {len(snapshot['actuals'])} WIND actuals")


if __name__ == "__main__":
    main()
