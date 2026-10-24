import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI before seeding");
const snapshot = JSON.parse(
  await readFile(new URL("../data/snapshot.json", import.meta.url), "utf8"),
);
const client = new MongoClient(process.env.MONGODB_URI);
try {
  await client.connect();
  const db = client.db();
  // Idempotent keyed upserts; a failed run can safely be repeated.
  for (const name of ["forecasts", "actuals"]) {
    await db
      .collection(name)
      .createIndex({ startTime: 1, publishTime: 1 }, { unique: true });
    await db
      .collection(name)
      .bulkWrite(
        snapshot[name].map((r) => ({
          updateOne: {
            filter: { startTime: r.startTime, publishTime: r.publishTime },
            update: { $set: r },
            upsert: true,
          },
        })),
      );
    console.log(`Seeded ${snapshot[name].length} ${name}`);
  }
  await db
    .collection("metadata")
    .updateOne({ _id: "snapshot" }, { $set: snapshot.meta }, { upsert: true });
} finally {
  await client.close();
}
