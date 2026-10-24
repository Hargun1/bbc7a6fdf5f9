"""Explicit snapshot/MongoDB storage. Database failures never silently fall back."""
import json
import os
from pathlib import Path
from threading import RLock
from pymongo import MongoClient
from server.analytics import Analysis

ROOT = Path(__file__).resolve().parent.parent
_cached = None
_lock = RLock()


def get_repository():
    global _cached
    with _lock:
        if _cached is None:
            uri = os.getenv("MONGODB_URI")
            if not uri:
                snapshot = json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8"))
                mode = "Bundled Elexon snapshot"
            else:
                with MongoClient(uri, serverSelectionTimeoutMS=5000, maxPoolSize=5) as client:
                    db = client.get_default_database(default="aeris")
                    meta = db.metadata.find_one({"_id": "snapshot"})
                    forecasts = list(db.forecasts.find({}, {"_id": 0}))
                    actuals = list(db.actuals.find({}, {"_id": 0}))
                    if not meta or not forecasts or not actuals:
                        raise RuntimeError("MongoDB has no snapshot. Run python -m scripts.seed.")
                    meta.pop("_id", None)
                    snapshot = dict(meta=meta, forecasts=forecasts, actuals=actuals)
                    mode = "MongoDB"
            # Cache only after successful loading. Failure remains retryable.
            _cached = Analysis(snapshot), snapshot, mode
        return _cached
