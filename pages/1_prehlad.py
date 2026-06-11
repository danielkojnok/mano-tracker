"""
Page 1 — Prehľad (Overview)
The investor's 30-second answer to "how is the thesis doing?"
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard_utils import (
    COLORS, page_header, kpi_cards, style_fig, require_table,
    get_market, extend_market_future, get_kpis, get_price, get_gazette, get_judgments,
)
from model.pipeline import build_pipeline, projected_fy_revenue

page_header(
    "Prehľad",
    "Podporuje insolvenčný pipeline tézu o oživení tržieb MANO pre FY2026–27?",
)

ins   = get_market()
kpis  = get_kpis()
price = get_price()

if not require_table(ins, "insolvencies_monthly", "insolvency_stats.py"):
    st.stop()

# ── model projections (base case) ───────────────────────────────────────────
# Extend the date axis so already-observed investments project cash into FY27.
ins_ext = extend_market_future(ins, months=24)
pipe    = build_pipeline(ins_ext, scenario="base")
fy_base = projected_fy_revenue(pipe)

# ── hero KPIs ───────────────────────────────────────────────────────────────
ins_v   = ins.dropna(subset=["total"])
latest  = ins_v.iloc[-1]
yoy_ref = ins_v[ins_v["date"] <= latest["date"] - pd.DateOffset(months=12)]
yoy_pct = None
if not yoy_ref.empty:
    prev = yoy_ref.iloc[-1]["total"]
    if prev:
        yoy_pct = (latest["total"] - prev) / prev * 100

fy27 = fy_base[fy_base["fy"] == 2027]
fy27_rev = fy27["projected_revenue_gbp"].iloc[0] if not fy27.empty else None

cards = [
    {
        "label": "Mesačné insolvencie",
        "value": f"{int(latest['total']):,}",
        "sub": (f"{'▲' if (yoy_pct or 0) >= 0 else '▼'} {abs(yoy_pct):.1f}% medziročne"
                if yoy_pct is not None else latest["date"].strftime("%b %Y")),
        "dir": "up" if (yoy_pct or 0) >= 0 else "down",
    },
    {
        "label": "Implik. tržby FY27 (base)",
        "value": f"£{fy27_rev/1e6:.1f}m" if fy27_rev else "—",
        "sub": "model · základný scenár",
        "dir": "flat",
    },
]

if not price.empty:
    p_latest = price.iloc[-1]
    p_prev   = price.iloc[-2] if len(price) > 1 else p_latest
    p_chg    = (p_latest["close"] - p_prev["close"]) / p_prev["close"] * 100 if p_prev["close"] else 0
    cards.append({
        "label": "Cena akcie MANO.L",
        "value": f"{p_latest['close']:.1f}p",
        "sub": f"{'▲' if p_chg >= 0 else '▼'} {abs(p_chg):.1f}% deň",
        "dir": "up" if p_chg >= 0 else "down",
    })

# pipeline health: 12m vs prior 12m of mano_market_weighted (observed only)
mkt = ins.dropna(subset=["mano_market_weighted"])
last12  = mkt.tail(12)["mano_market_weighted"].sum()
prior12 = mkt.iloc[-24:-12]["mano_market_weighted"].sum() if len(mkt) >= 24 else None
health_pct = ((last12 - prior12) / prior12 * 100) if prior12 else None
if health_pct is not None:
    state = "Rastúci" if health_pct > 2 else ("Klesajúci" if health_pct < -2 else "Stabilný")
    cards.append({
        "label": "Zdravie pipeline",
        "value": state,
        "sub": f"{'▲' if health_pct >= 0 else '▼'} {abs(health_pct):.1f}% vážený trh 12m",
        "dir": "up" if health_pct >= 0 else "down",
    })

kpi_cards(cards)

# ── THESIS CHART ────────────────────────────────────────────────────────────
st.markdown("### Téza: insolvencie vedú tržby MANO o ~24 mesiacov")

LAG_MONTHS = 24
# use observed weighted market for the lead series (not the zero-padded future)
lead = ins[["date", "mano_market"]].dropna().copy()
lead["date_shift"] = lead["date"] + pd.DateOffset(months=LAG_MONTHS)
# 12m rolling to smooth
lead["market_12m"] = lead["mano_market"].rolling(12).mean() * 12  # annualised run-rate

# Actual MANO revenue points (FY end ~ March) → plot at FY-end date
rev_pts = kpis.copy()
rev_pts["fy_end"] = pd.to_datetime(rev_pts["fy"].astype(str) + "-03-31")

fig = go.Figure()

# Lead: annualised weighted insolvency run-rate, shifted +24m (right axis)
fig.add_trace(go.Scatter(
    x=lead["date_shift"], y=lead["market_12m"],
    name="Insolvencie (ročný run-rate, posun +24m)",
    line=dict(color=COLORS["accent"], width=2),
    yaxis="y2", hovertemplate="%{x|%b %Y}<br>%{y:,.0f} firiem/rok<extra></extra>",
))

# Actual MANO revenue (left axis, £m) as bars
fig.add_trace(go.Bar(
    x=rev_pts["fy_end"], y=rev_pts["revenue"] / 1e6,
    name="Skutočné tržby MANO (£m)",
    marker_color=COLORS["base"], opacity=0.75, width=1000*60*60*24*120,
    hovertemplate="FY%{customdata}<br>£%{y:.1f}m<extra></extra>",
    customdata=rev_pts["fy"],
))

# Model projection base (left axis, £m) extending into FY27.
# Cap at FY2027: beyond that the known pipeline decays (no future market input).
proj = fy_base[(fy_base["fy"] >= 2025) & (fy_base["fy"] <= 2027)].copy()
proj["fy_end"] = pd.to_datetime(proj["fy"].astype(str) + "-03-31")
fig.add_trace(go.Scatter(
    x=proj["fy_end"], y=proj["projected_revenue_gbp"] / 1e6,
    name="Projekcia tržieb (base, £m)",
    mode="lines+markers", line=dict(color=COLORS["bull"], width=2.5, dash="dot"),
    marker=dict(size=8),
    hovertemplate="FY%{customdata}<br>£%{y:.1f}m proj.<extra></extra>",
    customdata=proj["fy"],
))

fig.update_layout(
    yaxis=dict(title="Tržby MANO (£m)"),
    yaxis2=dict(title="Insolvencie/rok", overlaying="y", side="right",
                showgrid=False, color=COLORS["accent"]),
    barmode="overlay",
)
style_fig(fig, height=440, source="Insolvency Service · MANO RNS · model/pipeline.py")
st.plotly_chart(fig, width="stretch")
st.caption(
    f"Cyan = vážený insolvenčný objem posunutý o +{LAG_MONTHS} mesiacov (predstihový indikátor). "
    "Modré stĺpce = skutočné auditované tržby. Zelená bodkovaná = modelová projekcia do FY27."
)

st.divider()

# ── recent signals feed ─────────────────────────────────────────────────────
c1, c2 = st.columns([3, 2])

with c1:
    st.markdown("#### 📡 Najnovšie signály — The Gazette")
    gaz = get_gazette()
    if gaz.empty:
        st.caption("Spusti `python ingest/gazette_notices.py`.")
    else:
        html = "<div class='feed'>"
        for _, r in gaz.head(10).iterrows():
            is_pet = r.get("notice_type") == "2450"
            tag = ("<span class='tag tag-pet'>návrh na likvidáciu</span>" if is_pet
                   else "<span class='tag tag-liq'>menovanie likvidátora</span>")
            html += (f"<div class='feed-item'><span class='when'>{r['date']}</span> "
                     f"<span class='what'>{(r['company_name'] or '—')[:54]}</span>{tag}</div>")
        html += "</div>"
        st.markdown(html, unsafe_allow_html=True)

with c2:
    st.markdown("#### ⚖️ Súdne rozhodnutia — MANO")
    jud = get_judgments()
    if jud.empty:
        st.caption("Spusti `python ingest/caselaw_feed.py`.")
    else:
        html = "<div class='feed'>"
        for _, r in jud.head(6).iterrows():
            html += (f"<div class='feed-item'><span class='when'>{r['date']}</span> "
                     f"<span class='what'>{(r['case_name'] or '—')[:48]}</span>"
                     f"<span class='tag tag-jud'>rozsudok</span></div>")
        html += "</div>"
        st.markdown(html, unsafe_allow_html=True)
