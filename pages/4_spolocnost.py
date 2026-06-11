"""
Page 4 — MANO Spoločnosť (Company view)
Share price with events, KPI history small multiples, judgments, forward book.
"""

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

from dashboard_utils import (
    COLORS, page_header, style_fig, require_table,
    get_price, get_kpis, get_judgments, kpi_cards,
)

page_header("MANO Spoločnosť", "Manolete Partners PLC (LON: MANO.L) — kurz, KPI, súdne spory.")

price = get_price()
kpis  = get_kpis()
jud   = get_judgments()

# ── forward book context (hardcoded from research notes) ────────────────────
# Source: MANO H1 FY2026 RNS / investor presentation (Nov 2025):
#   total investment portfolio fair value ≈ £67m; of which large cases ≈ £32m.
FORWARD_BOOK_TOTAL = 67_000_000
FORWARD_BOOK_LARGE = 32_000_000

# ── share price with annotated events ───────────────────────────────────────
st.markdown("### Cena akcie s kľúčovými udalosťami")
if not require_table(price, "mano_price", "mano_price.py"):
    st.stop()

# Key RNS / results events (hardcode known dates; source: MANO RNS history)
EVENTS = [
    ("2024-06-18", "FY24 results"),
    ("2024-11-19", "H1 FY25 results"),
    ("2025-06-17", "FY25 results"),
    ("2025-11-18", "H1 FY26 results"),
]

fig = go.Figure()
fig.add_trace(go.Scatter(
    x=price["date"], y=price["close"], name="MANO.L",
    line=dict(color=COLORS["accent"], width=1.6),
    fill="tozeroy", fillcolor="rgba(34,211,238,.07)",
    hovertemplate="%{x|%d %b %Y}<br>%{y:.1f}p<extra></extra>",
))
pmax = price["close"].max()
for d, label in EVENTS:
    dt = pd.Timestamp(d)
    if price["date"].min() <= dt <= price["date"].max():
        fig.add_vline(x=dt, line_dash="dot", line_color=COLORS["muted"], opacity=0.5)
        fig.add_annotation(x=dt, y=pmax, text=label, showarrow=False,
                           textangle=-90, xanchor="left", yanchor="top",
                           font=dict(size=9, color=COLORS["muted"]))
fig.update_layout(yaxis_title="GBX (pence)", xaxis_title="")
style_fig(fig, height=420, source="yfinance · MANO RNS (event dates)")
st.plotly_chart(fig, width="stretch")

st.divider()

# ── KPI history small multiples ─────────────────────────────────────────────
st.markdown("### Vývoj KPI (FY2019–FY2026)")
if require_table(kpis, "mano_kpis", "seed_kpis.py"):
    fig_k = make_subplots(
        rows=1, cols=3,
        subplot_titles=("Tržby (£m)", "Ukončené prípady", "ARRCC (£k/prípad)"),
    )
    fy_s = kpis["fy"].astype(str)
    fig_k.add_trace(go.Bar(x=fy_s, y=kpis["revenue"] / 1e6,
                           marker_color=COLORS["base"], showlegend=False), 1, 1)
    fig_k.add_trace(go.Bar(x=fy_s, y=kpis["cases_completed"],
                           marker_color=COLORS["amber"], showlegend=False), 1, 2)
    fig_k.add_trace(go.Bar(x=fy_s, y=kpis["rev_per_case"] / 1e3,
                           marker_color=COLORS["bull"], showlegend=False), 1, 3)
    style_fig(fig_k, height=320, source="MANO RNS / audited results")
    fig_k.update_layout(margin=dict(l=40, r=20, t=50, b=40))
    st.plotly_chart(fig_k, width="stretch")

st.divider()

# ── forward book context ────────────────────────────────────────────────────
st.markdown("### Forward book — kontext portfólia")
kpi_cards([
    {"label": "Hodnota portfólia (fair value)",
     "value": f"£{FORWARD_BOOK_TOTAL/1e6:.0f}m",
     "sub": "H1 FY2026 (RNS, nov 2025)", "dir": "flat"},
    {"label": "Z toho veľké prípady",
     "value": f"£{FORWARD_BOOK_LARGE/1e6:.0f}m",
     "sub": f"{FORWARD_BOOK_LARGE/FORWARD_BOOK_TOTAL*100:.0f}% portfólia", "dir": "flat"},
    {"label": "Aktívne investície",
     "value": f"{int(kpis['new_investments'].dropna().iloc[-1])}" if "new_investments" in kpis and kpis["new_investments"].notna().any() else "—",
     "sub": "naposledy vykázané (FY25)", "dir": "flat"},
])
st.caption("Zdroj: MANO H1 FY2026 investor presentation. Veľké prípady (>£1m nárok) "
           "majú vyššiu ARRCC, ale dlhší a variabilnejší lag — kľúčové pre bull scenár.")

st.divider()

# ── judgments table ─────────────────────────────────────────────────────────
st.markdown("### Súdne rozhodnutia — MANO ako účastník")
if require_table(jud, "judgments", "caselaw_feed.py"):
    show = jud.copy()
    show["link"] = show["url"]
    st.dataframe(
        show[["date", "case_name", "link"]].rename(columns={
            "date": "Dátum", "case_name": "Prípad", "link": "Odkaz",
        }),
        width="stretch", hide_index=True,
        column_config={"Odkaz": st.column_config.LinkColumn("Find Case Law",
                                                            display_text="otvoriť ↗")},
    )
    st.caption("Zdroj: Find Case Law (The National Archives). "
               "Rozsudky kde Manolete Partners vystupuje ako strana sporu.")
