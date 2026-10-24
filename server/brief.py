"""Self-contained, printable decision record. No scripts or external resources."""
from html import escape


def render_brief(brief):
    def text(value):
        return escape(str(value)) if value is not None else "—"

    def number(value, digits=0):
        return f"{value:,.{digits}f}" if value is not None else "—"

    summary, risk = brief["summary"], brief["historicalRisk"]
    rows = "".join(f'<tr><td>{text(r["label"])}</td><td>{number(r["forecastMW"])}</td>'
                   f'<td>{number(r["lowerScenarioMW"])}</td><td>{text(r["publishTime"])}</td></tr>'
                   for r in brief["rows"])
    notes = "".join(f"<li>{text(n)}</li>" for n in brief["notes"])
    hashes = "".join(f'<div>{text(m["url"])}<br>SHA-256: {text(m["sha256"])}</div>'
                     for m in brief["provenance"]["manifest"])
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aeris decision brief · {text(brief["decisionDate"])}</title><style>
@page{{size:A4;margin:12mm}}*{{box-sizing:border-box}}body{{font:11px/1.5 Arial,sans-serif;color:#2b2a2a;max-width:850px;margin:30px auto;padding:20px}}h1{{font:32px Georgia,serif;margin:5px 0 12px}}h2{{font-size:13px;margin:14px 0 6px}}.eyebrow{{font-size:9px;letter-spacing:2px;color:#148937}}.meta{{background:#f7f6f2;padding:12px;display:flex;gap:25px;flex-wrap:wrap}}.metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:15px 0}}.metrics div{{border:1px solid #e8e7e3;padding:10px}}.metrics b{{font-size:20px;display:block}}small{{color:#7a776e}}table{{width:100%;border-collapse:collapse;font-size:10px}}td,th{{padding:4px 7px;border-bottom:1px solid #e8e7e3;text-align:left}}th{{background:#f8f8f6}}ul{{padding-left:16px;font-size:9px}}.sources{{font:8px/1.5 monospace;overflow-wrap:anywhere}}.sources div{{margin-bottom:5px}}footer{{margin-top:12px;border-top:1px solid #e8e7e3;padding-top:8px;color:#7a776e;font-size:9px}}@media print{{body{{margin:0;padding:0}}tr{{break-inside:avoid}}}}@media(max-width:600px){{.metrics{{grid-template-columns:repeat(2,1fr)}}table{{font-size:8px}}}}
</style></head><body><div class="eyebrow">AERIS · DAY-AHEAD WIND INTELLIGENCE</div><h1>Decision brief.</h1>
<div class="meta"><span><small>Decision date</small><br><b>{text(brief["decisionDate"])}</b></span><span><small>Delivery day</small><br><b>{text(brief["deliveryDate"])}</b></span><span><small>Cutoff · UTC / GMT</small><br><b>{text(brief["cutoff"])}</b></span><span><small>Coverage</small><br><b>{summary["forecastHours"]} / 24 forecast hours</b></span></div>
<div class="metrics"><div>Mean wind forecast<b>{number(summary["mean"] / 1000 if summary["mean"] is not None else None, 2)} GW</b></div><div>Forecast energy<b>{number(summary["energy"] / 1000 if summary["energy"] is not None else None, 2)} GWh</b></div><div>P{risk["confidence"]} shortfall buffer<b>{number(risk["bufferMW"])} MW</b></div><div>Prior training sample<b>{risk["trainingN"]} hours</b></div></div>
<p>Compared with {text(brief["earlierCutoff"])} GMT: {brief["revisionSummary"]["changedHours"]} hours changed; energy revision {number(brief["revisionSummary"]["energyRevisionMWh"])} MWh. A missing value remains unavailable.</p>
<h2>Selected forecasts · MW</h2><table><thead><tr><th>Delivery hour · GMT</th><th>Forecast</th><th>Lower scenario</th><th>Forecast publication · UTC</th></tr></thead><tbody>{rows}</tbody></table>
<h2>Decision context</h2><ul>{notes}</ul><h2>Source record</h2><p>Retrieved {text(brief["provenance"]["retrievedAt"])} · Training deliveries {text(risk["trainingFrom"])} to {text(risk["trainingTo"])}</p><div class="sources">{hashes}</div>
<footer>Brief ID {text(brief["briefId"])} · Independent assessment pilot · Elexon WINDFOR + FUELHH (WIND). Open this self-contained file and use Print / Save as PDF to retain a paper record.</footer></body></html>'''
