"""FastAPI application shared by local, Docker, and Vercel runtimes."""
import csv
import io
import logging
import re
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from server.analytics import cutoff_for
from server.repository import get_repository, ROOT

app = FastAPI(title="Aeris Wind Intelligence", version="2.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)


@app.middleware("http")
async def response_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(ValueError)
async def invalid_input(request, exc):
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.exception_handler(Exception)
async def unavailable(request, exc):
    logging.error("Data initialization/request failed: %s", type(exc).__name__)
    return JSONResponse(status_code=503, content={"error": "Data unavailable. Check snapshot or MongoDB configuration."})


def params(request):
    for key in ("date", "cutoff", "hour", "scope"):
        if len(request.query_params.getlist(key)) > 1:
            raise ValueError("Invalid parameters: duplicate query key")
    date = request.query_params.get("date", "2026-01-15")
    cutoff = request.query_params.get("cutoff", "09:00")
    cutoff_for(date, cutoff)
    return date, cutoff


@app.get("/api/health")
def health():
    _, snapshot, mode = get_repository()
    return dict(status="ok", storage=mode, backend="Python / FastAPI", retrievedAt=snapshot["meta"]["retrievedAt"])


@app.get("/api/overview")
def overview(request: Request):
    date, cutoff = params(request)
    analysis, _, mode = get_repository()
    return dict(analysis.overview(date, cutoff), storage=mode)


@app.get("/api/accuracy")
def accuracy(request: Request):
    _, cutoff = params(request)
    return get_repository()[0].month(cutoff)


@app.get("/api/revisions")
def revisions(request: Request):
    date, cutoff = params(request)
    hour = request.query_params.get("hour", "12")
    if not re.fullmatch(r"\d{1,2}", hour) or not 0 <= int(hour) <= 23:
        raise ValueError("Hour must be 0–23")
    return get_repository()[0].revisions(date, cutoff, int(hour))


@app.get("/api/export")
def export(request: Request):
    date, cutoff = params(request)
    analysis, snapshot, _ = get_repository()
    scope = request.query_params.get("scope", "day")
    if scope not in ("day", "month"):
        raise ValueError("Scope must be day or month")
    rows = analysis.month(cutoff)["rows"] if scope == "month" else analysis.day(date, cutoff)["rows"]
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["decision_cutoff_uk", "decision_date", "delivery_start_utc", "forecast_mw",
                     "actual_hourly_mean_mw", "forecast_publish_utc", "actual_publish_utc", "lead_hours",
                     "error_forecast_minus_actual_mw", "retrieved_at_utc"])
    fields = ["startTime", "forecast", "actual", "publishTime", "actualPublishTime", "leadHours", "error"]
    for row in rows:
        writer.writerow([cutoff, row.get("decisionDate", date), *[row.get(f) for f in fields], snapshot["meta"]["retrievedAt"]])
    label = "january" if scope == "month" else date
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="aeris-{label}-{cutoff.replace(":", "")}.csv"'})


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def unknown(path: str):
    return JSONResponse(status_code=404, content={"error": "API route not found"})


# Vercel serves static assets from dist; Docker serves them from this same app.
if (ROOT / "dist").is_dir():
    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True), name="frontend")
