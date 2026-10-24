import json
import os
from pymongo import MongoClient, UpdateOne
from server.repository import ROOT


def main():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise SystemExit("Set MONGODB_URI before seeding")
    snapshot = json.loads((ROOT / "data/snapshot.json").read_text(encoding="utf-8"))
    with MongoClient(uri, serverSelectionTimeoutMS=10000) as client:
        db = client.get_default_database(default="aeris")
        for name in ("forecasts", "actuals"):
            db[name].create_index([("startTime", 1), ("publishTime", 1)], unique=True)
            db[name].bulk_write([UpdateOne({"startTime": r["startTime"], "publishTime": r["publishTime"]},
                                           {"$set": r}, upsert=True) for r in snapshot[name]])
            print(f"Seeded {len(snapshot[name])} {name}")
        db.metadata.update_one({"_id": "snapshot"}, {"$set": snapshot["meta"]}, upsert=True)


if __name__ == "__main__":
    main()
