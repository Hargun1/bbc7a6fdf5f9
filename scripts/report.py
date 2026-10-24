import json
from server.analytics import Analysis
from server.repository import ROOT

if __name__ == "__main__":
    analysis = Analysis(json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8")))
    for time in ("09:00", "09:20", "09:50", "15:00"):
        print(json.dumps(dict(cutoff=time, **analysis.month(time)["metrics"]), indent=2))
