import { readFile } from "node:fs/promises";
import { makeEngine } from "../server/analytics.js";
const s = JSON.parse(
  await readFile(new URL("../data/snapshot.json", import.meta.url)),
);
const e = makeEngine(s);
for (const time of ["09:00", "09:20", "09:50", "15:00"]) {
  const m = e.month(time);
  console.log(
    JSON.stringify(
      {
        cutoff: time,
        pairedHours: m.metrics.n,
        forecastHours: m.forecastHours,
        actualHours: m.actualHours,
        ...m.metrics,
      },
      null,
      2,
    ),
  );
}
