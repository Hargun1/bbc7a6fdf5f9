import app from "./app.js";
app.listen(process.env.PORT || 3001, "0.0.0.0", () =>
  console.log(`Aeris API: http://127.0.0.1:${process.env.PORT || 3001}`),
);
