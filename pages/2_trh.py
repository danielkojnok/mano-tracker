"""
Page 2 — Insolvenčný trh (Market depth)
Monthly trend, sector heatmap, sector league table, regional split.
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard_utils import (
    COLORS, page_header, style_fig, require_table, sic2_label,
    get_market, get_record_level,
)

page_header("Insolvenčný trh", "Kde sa insolvencie zahrievajú — podľa typu, sektora a regiónu.")

mkt = get_market()
rl  = get_record_level()

if not require_table(mkt, "insolvencies_monthly", "insolvency_stats.py"):
    st.stop()

# ── monthly split: CVL / compulsory / administration ────────────────────────
st.markdown("### Mesačný objem podľa typu konania")
m = mkt[mkt["date"] >= "2016-01-01"].copy()

fig = go.Figure()
for col, name, color in [
    ("cvl", "CVL (dobrovoľná)", COLORS["cvl"]),
    ("compulsory", "Núdená (súdna)", COLORS["compulsory"]),
    ("administration", "Administrácia", COLORS["admin"]),
]:
    if col in m.columns:
        fig.add_trace(go.Bar(x=m["date"], y=m[col], name=name, marker_color=color))
fig.add_trace(go.Scatter(
    x=m["date"], y=m["mano_market"].rolling(12).mean(),
    name="MANO trh — 12m priemer", line=dict(color=COLORS["accent"], width=2.5),
))
fig.update_layout(barmode="stack", yaxis_title="Počet firiem")
style_fig(fig, height=420, source="Insolvency Service Long-Run Series")
st.plotly_chart(fig, width="stretch")

st.divider()

# Everything below needs record-level data
if not require_table(rl, "insolvencies_record_level", "record_level.py"):
    st.stop()

rl = rl.copy()
rl["dt"] = pd.to_datetime(rl["month_registered"] + "-01", errors="coerce")
rl = rl.dropna(subset=["dt"])

# ── SECTOR HEATMAP: SIC2 × month ────────────────────────────────────────────
st.markdown("### 🔥 Sektorová heatmapa — ktoré odvetvia sa zahrievajú")
months_window = st.slider("Okno (počet mesiacov dozadu)", 12, 48, 24, step=6)
cutoff = rl["dt"].max() - pd.DateOffset(months=months_window - 1)
recent = rl[rl["dt"] >= cutoff]

top_sics = recent["sic_2digit"].value_counts().head(15).index.tolist()
heat = (recent[recent["sic_2digit"].isin(top_sics)]
        .groupby(["sic_2digit", "dt"]).size().reset_index(name="n"))
pivot = heat.pivot(index="sic_2digit", columns="dt", values="n").fillna(0)
pivot = pivot.loc[pivot.sum(axis=1).sort_values(ascending=False).index]
ylabels = [f"{s} · {sic2_label(s)}" for s in pivot.index]

fig_h = go.Figure(go.Heatmap(
    z=pivot.values,
    x=[d.strftime("%b %y") for d in pivot.columns],
    y=ylabels,
    colorscale=[[0, COLORS["panel"]], [0.4, COLORS["base"]],
                [0.7, COLORS["amber"]], [1, COLORS["bear"]]],
    hovertemplate="%{y}<br>%{x}<br>%{z:.0f} insolvencií<extra></extra>",
    colorbar=dict(title="Počet"),
))
fig_h.update_layout(yaxis=dict(autorange="reversed"))
style_fig(fig_h, height=520, source="Insolvency Service Record-Level (SIC 2-digit)")
st.plotly_chart(fig_h, width="stretch")
st.caption("Tmavšia/červenšia = viac insolvencií v sektore za daný mesiac. "
           "Top 15 sektorov podľa objemu vo zvolenom okne.")

st.divider()

# ── SECTOR LEAGUE TABLE with sparklines + YoY ───────────────────────────────
st.markdown("### Sektorová tabuľka — 12-mesačný objem, trend a medziročná zmena")

last_date = rl["dt"].max()
win_now  = rl[rl["dt"] > last_date - pd.DateOffset(months=12)]
win_prev = rl[(rl["dt"] <= last_date - pd.DateOffset(months=12)) &
              (rl["dt"] >  last_date - pd.DateOffset(months=24))]

now_counts  = win_now["sic_2digit"].value_counts()
prev_counts = win_prev["sic_2digit"].value_counts()

league = []
for sic in now_counts.head(15).index:
    n_now  = int(now_counts.get(sic, 0))
    n_prev = int(prev_counts.get(sic, 0))
    yoy = ((n_now - n_prev) / n_prev * 100) if n_prev else np.nan
    spark = (win_now[win_now["sic_2digit"] == sic]
             .groupby(win_now["dt"].dt.to_period("M")).size())
    if len(spark):
        spark = spark.reindex(
            pd.period_range(spark.index.min(), spark.index.max(), freq="M"),
            fill_value=0)
    league.append({
        "sic": sic, "label": sic2_label(sic),
        "n_now": n_now, "yoy": yoy,
        "spark": spark.values.tolist() if len(spark) else [],
    })

hdr = st.columns([1, 3, 1.4, 1.4, 2.5])
for c, t in zip(hdr, ["SIC", "Sektor", "12m objem", "YoY", "Trend"]):
    c.markdown(f"<span style='color:{COLORS['muted']};font-size:.74rem;"
               f"text-transform:uppercase'>{t}</span>", unsafe_allow_html=True)

for row in league:
    c = st.columns([1, 3, 1.4, 1.4, 2.5])
    c[0].markdown(f"**{row['sic']}**")
    c[1].write(row["label"])
    c[2].markdown(f"`{row['n_now']:,}`")
    if np.isnan(row["yoy"]):
        c[3].markdown(f"<span style='color:{COLORS['muted']}'>—</span>", unsafe_allow_html=True)
    else:
        up = row["yoy"] >= 0
        col = COLORS["bear"] if up else COLORS["bull"]  # more insolvencies = red
        c[3].markdown(f"<span style='color:{col}'>{'▲' if up else '▼'} "
                      f"{abs(row['yoy']):.0f}%</span>", unsafe_allow_html=True)
    if row["spark"]:
        sp = go.Figure(go.Scatter(
            y=row["spark"], mode="lines",
            line=dict(color=COLORS["accent"], width=1.5), fill="tozeroy",
            fillcolor="rgba(34,211,238,.12)"))
        sp.update_layout(height=38, margin=dict(l=0, r=0, t=0, b=0),
                         paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                         xaxis=dict(visible=False), yaxis=dict(visible=False),
                         showlegend=False)
        c[4].plotly_chart(sp, width="stretch",
                          config={"displayModeBar": False},
                          key=f"spark_{row['sic']}")

st.caption("YoY: červená = rast insolvencií (viac stresu v sektore), zelená = pokles. "
           "Zdroj: Insolvency Service Record-Level.")

st.divider()

# ── REGIONAL SPLIT ──────────────────────────────────────────────────────────
st.markdown("### Regionálne rozdelenie")
reg = (rl.groupby([rl["dt"].dt.to_period("Q").astype(str), "register_location"])
       .size().reset_index(name="n"))
reg.columns = ["quarter", "region", "n"]
reg = reg[reg["quarter"] >= "2016Q1"]

fig_r = go.Figure()
for region, color in [("England/Wales", COLORS["base"]), ("Scotland", COLORS["amber"])]:
    d = reg[reg["region"] == region]
    fig_r.add_trace(go.Scatter(x=d["quarter"], y=d["n"], name=region,
                               mode="lines", line=dict(color=color, width=2),
                               stackgroup="one"))
fig_r.update_layout(yaxis_title="Insolvencie / štvrťrok")
style_fig(fig_r, height=360, source="Insolvency Service Record-Level (register_location)")
st.plotly_chart(fig_r, width="stretch")

tot = rl["register_location"].value_counts()
ew, sc = int(tot.get("England/Wales", 0)), int(tot.get("Scotland", 0))
st.caption(f"Od 2016: Anglicko/Wales **{ew:,}** ({ew/(ew+sc)*100:.0f}%) · "
           f"Škótsko **{sc:,}** ({sc/(ew+sc)*100:.0f}%). "
           "MANO operuje primárne v Anglicku & Walese.")
