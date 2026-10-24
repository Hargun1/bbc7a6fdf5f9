import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
let cached;
export function getRepository() {
  if (!cached)
    cached = load().catch((error) => {
      cached = undefined;
      throw error;
    });
  return cached;
}
async function load() {
  if (!process.env.MONGODB_URI) {
    return {
      snapshot: JSON.parse(
        await readFile(
          new URL("../data/snapshot.json", import.meta.url),
          "utf8",
        ),
      ),
      mode: "Bundled Elexon snapshot",
    };
  }
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 5,
  });
  try {
    await client.connect();
    const db = client.db();
    const [meta, forecasts, actuals] = await Promise.all([
      db.collection("metadata").findOne({ _id: "snapshot" }),
      db
        .collection("forecasts")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
      db
        .collection("actuals")
        .find({}, { projection: { _id: 0 } })
        .toArray(),
    ]);
    if (!meta || !forecasts.length || !actuals.length)
      throw new Error("MongoDB has no snapshot. Run npm run seed.");
    const { _id, ...info } = meta;
    return { snapshot: { meta: info, forecasts, actuals }, mode: "MongoDB" };
  } finally {
    await client.close();
  }
}
