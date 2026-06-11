"""
Page 3 — MANO Pipeline model
Interactive scenario explorer, funnel, projection with lag band, backtest.
All model maths comes from model/pipeline.py — this page only drives & draws it.
"""

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard_utils import (
    COLORS, SCENARIO_COLORS, SCENARIO_LABELS, page_header, style_fig, require_table,
    get_market, extend_market_future, get_kpis,
)
from model import pipeline as P

page_header("MANO Pipeline model",
            "Insolvenčný trh → dopyty → investície → ukončenia → hotovosť → tržby.")

ins = get_market()
if not require_table(ins, "insolvencies_monthly", "insolvency_stats.py"):
    st.stop()
kpis = get_kpis()

# ── sidebar: scenario explorer ──────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 🔧 Scenár")
    scenario = st.radio(
        "ARRCC scenár (tržba/prípad)",
        options=["bear", "base", "bull"],
        format_func=lambda s: f"{SCENARIO_LABELS[s]} · £{P.REV_PER_CASE_SCENARIOS[s]//1000}k",
        index=1,
    )
    st.markdown("---")
    referral = st.slider("Referral rate (%)", 1.0, 10.0,
                         P.REFERRAL_RATE * 100, 0.25) / 100
    acceptance = st.slider("Acceptance rate (%)", 10.0, 60.0,
                           P.ACCEPTANCE_RATE * 100, 1.0) / 100
    comp_weight = st.slider("Compulsory weight (×)", 1.0, 2.0,
                            P.COMPULSORY_WEIGHT, 0.05)
    use_cap = st.toggle("Kapacitný strop", value=True,
                        help=f"Strop {P.ANNUAL_INVESTMENT_CAP} investícií/rok")
    st.caption("Hodnoty sa prepočítajú naživo.")

# ── recompute via pipeline with overrides ───────────────────────────────────
ins_ext = extend_market_future(ins, months=24)
pipe = P.build_pipeline(
    ins_ext, scenario=scenario,
    referral_rate=referral, acceptance_rate=acceptance,
    compulsory_weight=comp_weight, apply_capacity_cap=use_cap,
)
fy = P.projected_fy_revenue(pipe)

# headline projection numbers
fy26 = fy[fy["fy"] == 2026]["projected_revenue_gbp"]
fy27 = fy[fy["fy"] == 2027]["projected_revenue_gbp"]
c1, c2, c3 = st.columns(3)
c1.metric("Projekcia FY2026", f"£{fy26.iloc[0]/1e6:.1f}m" if len(fy26) else "—")
c2.metric("Projekcia FY2027", f"£{fy27.iloc[0]/1e6:.1f}m" if len(fy27) else "—")
c3.metric("Tržba/prípad (ARRCC)", f"£{P.REV_PER_CASE_SCENARIOS[scenario]:,}")

st.divider()

# ── FUNNEL ──────────────────────────────────────────────────────────────────
st.markdown("### Lievik konverzie — posledných 12 mesiacov (anualizované)")
obs = pipe[pipe["date"] <= ins["date"].max()]
last12 = obs.tail(12)
market_12   = last12["mano_market_weighted"].sum()
referrals12 = last12["implied_referrals"].sum()
invest12    = last12["implied_investments_capped"].sum()
completions12 = pipe["implied_completions"].dropna().tail(12).sum()
cash12        = pipe["implied_cash_month"].dropna().tail(12).sum()

fig_f = go.Figure(go.Funnel(
    y=["Vážený trh", "Dopyty (referrals)", "Investície", "Ukončenia", "Hotovosť"],
    x=[market_12, referrals12, invest12, completions12, cash12],
    textposition="inside",
    textinfo="value+percent initial",
    marker=dict(color=[COLORS["accent"], COLORS["base"], COLORS["amber"],
                       COLORS["admin"], COLORS["bull"]]),
    connector=dict(line=dict(color=COLORS["grid"])),
))
style_fig(fig_f, height=380, source="model/pipeline.py (vážený trh → hotovosť)")
fig_f.update_layout(margin=dict(l=120, r=30, t=40, b=70))
st.plotly_chart(fig_f, width="stretch")

st.divider()

# ── PROJECTION with lag band ────────────────────────────────────────────────
st.markdown("### Projekcia tržieb s pásmom neistoty lagu (±6 mes.)")
fyp = fy[(fy["fy"] >= 2019) & (fy["fy"] <= 2027)].copy()
fy_str = fyp["fy"].astype(str)
scol = SCENARIO_COLORS[scenario]

fig_p = go.Figure()
fig_p.add_trace(go.Scatter(
    x=list(fy_str) + list(fy_str)[::-1],
    y=list(fyp["projected_revenue_high"] / 1e6) +
      list(fyp["projected_revenue_low"][::-1] / 1e6),
    fill="toself", fillcolor="rgba(59,130,246,.12)",
    line=dict(color="rgba(0,0,0,0)"), name="Pásmo lagu (±6m)", hoverinfo="skip",
))
act = kpis[kpis["fy"] >= 2019]
fig_p.add_trace(go.Bar(
    x=act["fy"].astype(str), y=act["revenue"] / 1e6,
    name="Skutočné tržby", marker_color="rgba(148,163,184,.55)", width=0.45,
))
fig_p.add_trace(go.Scatter(
    x=fy_str, y=fyp["projected_revenue_gbp"] / 1e6,
    name=f"Projekcia ({SCENARIO_LABELS[scenario]})",
    mode="lines+markers", line=dict(color=scol, width=2.5), marker=dict(size=7),
))
fig_p.update_layout(yaxis_title="£m", xaxis_title="Fiškálny rok")
style_fig(fig_p, height=420, source="model/pipeline.py · MANO RNS (actuals)")
st.plotly_chart(fig_p, width="stretch")

st.divider()

# ── BACKTEST table ──────────────────────────────────────────────────────────
st.markdown("### Backtest — model vs. skutočnosť (FY2019–2026)")
bt = pd.merge(
    fy[["fy", "projected_revenue_gbp"]],
    kpis[["fy", "revenue"]], on="fy", how="inner",
)
bt = bt[(bt["fy"] >= 2019) & (bt["fy"] <= 2026)].copy()
bt["error_pct"] = (bt["projected_revenue_gbp"] - bt["revenue"]) / bt["revenue"] * 100
bt_disp = pd.DataFrame({
    "FY": bt["fy"],
    "Projekcia £m": (bt["projected_revenue_gbp"] / 1e6).round(1),
    "Skutočné £m": (bt["revenue"] / 1e6).round(1),
    "Chyba %": bt["error_pct"].round(0),
})
mae = bt["error_pct"].abs().mean()
st.dataframe(bt_disp.set_index("FY"), width="stretch")
st.caption(f"Priemerná absolútna chyba (MAPE): **{mae:.0f}%**. "
           "Model je hrubý predstihový rámec, nie presná predpoveď — slúži na "
           "smer a rád veľkosti, nie na desatinné miesta.")

st.divider()

# ── assumptions reference ───────────────────────────────────────────────────
st.markdown("### Referenčné predpoklady modelu (aktuálne hodnoty zo sliderov)")
ref = pd.DataFrame([
    ("referral_rate", f"{referral*100:.2f}%", "Podiel váženého trhu → dopyt MANO", "research_01"),
    ("acceptance_rate", f"{acceptance*100:.0f}%", "Podiel dopytov → investícia", "RNS FY25 (896 ref → 282 inv)"),
    ("compulsory_weight", f"{comp_weight:.2f}×", "Vyššia hodnota núdených likvidácií", "research_01/03"),
    ("case_lag_months", f"{P.CASE_LAG_MONTHS} mes.", "Investícia → ukončenie", "research_01 (medián)"),
    ("cash_lag_months", f"{P.CASH_LAG_MONTHS} mes.", "Ukončenie → inkaso", "RNS cash conversion"),
    ("lag_uncertainty", f"±{P.LAG_UNCERTAINTY} mes.", "Pásmo low/high projekcie", "bimodálne trvanie prípadov"),
    ("capacity_cap", f"{'ON' if use_cap else 'OFF'} · {P.ANNUAL_INVESTMENT_CAP}/rok", "Strop upisovania", "FY25 = 282 inv"),
    ("ARRCC bear/base/bull",
     f"£{P.REV_PER_CASE_SCENARIOS['bear']//1000}k / "
     f"£{P.REV_PER_CASE_SCENARIOS['base']//1000}k / "
     f"£{P.REV_PER_CASE_SCENARIOS['bull']//1000}k",
     "Priem. realizovaná tržba/prípad", "research_02 (FY21–FY26)"),
], columns=["Parameter", "Hodnota", "Popis", "Zdroj"])
st.dataframe(ref.set_index("Parameter"), width="stretch")
