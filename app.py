"""
app.py
MANO Tracker — Streamlit dashboard.

Run locally:  streamlit run app.py
"""

import sqlite3
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from model.pipeline import build_pipeline, projected_fy_revenue, load_insolvencies

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "tracker.db"

st.set_page_config(
    page_title="MANO Tracker",
    page_icon="⚖️",
    layout="wide",
)

st.title("⚖️ MANO Tracker")
st.caption(
    "UK insolvency data as a leading indicator for "
    "[Manolete Partners PLC](https://www.londonstockexchange.com/stock/MANO) (LON: MANO.L)"
)

# ── helpers ────────────────────────────────────────────────────────────────

@st.cache_data(ttl=3600)
def get_insolvencies():
    return load_insolvencies(DB_PATH)

@st.cache_data(ttl=3600)
def get_price():
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql(
            "SELECT date, close FROM mano_price ORDER BY date",
            conn, parse_dates=["date"],
        )
    except Exception:
        df = pd.DataFrame(columns=["date", "close"])
    conn.close()
    return df

@st.cache_data(ttl=3600)
def get_kpis():
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql("SELECT * FROM mano_kpis ORDER BY fy", conn)
    except Exception:
        df = pd.DataFrame()
    conn.close()
    return df

# ── data ───────────────────────────────────────────────────────────────────
ins   = get_insolvencies()
price = get_price()
kpis  = get_kpis()

if ins.empty:
    st.warning(
        "No insolvency data yet. Run `python ingest/insolvency_stats.py` first."
    )
    st.stop()

pipeline, fy_proj = build_pipeline(ins), projected_fy_revenue(build_pipeline(ins))

# ── KPI cards ──────────────────────────────────────────────────────────────
latest = ins[ins["mano_market"].notna()].iloc[-1]
latest_date = latest["date"].strftime("%b %Y")
rolling_12m = ins.tail(12)["mano_market"].sum()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Latest month CVL+Comp", f"{int(latest['mano_market']):,}", f"{latest_date}")
col2.metric("12-month rolling total", f"{int(rolling_12m):,}")

if not price.empty:
    latest_price = price.iloc[-1]
    col3.metric("MANO.L (GBX)", f"{latest_price['close']:.1f}p",
                f"{latest_price['date'].strftime('%d %b %Y')}")

if not kpis.empty:
    last_fy = kpis.iloc[-1]
    col4.metric(f"FY{int(last_fy['fy'])} Revenue",
                f"£{last_fy['revenue']/1e6:.1f}m",
                f"{int(last_fy['cases_completed'])} cases")

st.divider()

# ── Tab layout ─────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["📊 Insolvency Pipeline", "📈 FY Projection", "💷 MANO.L Price"])

# ── Tab 1: Insolvency trend ────────────────────────────────────────────────
with tab1:
    st.subheader("Monthly CVL + Compulsory Liquidations (England & Wales)")

    # Rolling 12-month avg
    ins_plot = ins.copy()
    ins_plot["roll12"] = ins_plot["mano_market"].rolling(12).mean()

    fig1 = go.Figure()
    fig1.add_trace(go.Bar(
        x=ins_plot["date"], y=ins_plot["mano_market"],
        name="CVL + Compulsory", marker_color="steelblue", opacity=0.6,
    ))
    fig1.add_trace(go.Scatter(
        x=ins_plot["date"], y=ins_plot["roll12"],
        name="12-month rolling avg", line=dict(color="orange", width=2),
    ))
    fig1.update_layout(
        xaxis_title="", yaxis_title="Companies",
        legend=dict(orientation="h"),
        height=420,
        hovermode="x unified",
    )
    st.plotly_chart(fig1, use_container_width=True)

    with st.expander("How this feeds MANO"):
        st.markdown("""
        Manolete's deal flow originates from insolvent companies.  
        ~**4.25%** of monthly CVL + compulsory liquidations reach MANO as enquiries.  
        ~**30%** of enquiries are accepted → new case investments.  
        Completions lag ~**13 months**, cash collection a further ~**12 months**.
        """)

# ── Tab 2: FY Revenue projection ───────────────────────────────────────────
with tab2:
    st.subheader("Projected vs. Actual MANO Revenue by Financial Year (Apr–Mar)")

    # Merge projected with actual
    merged = pd.merge(fy_proj, kpis[["fy", "revenue"]], on="fy", how="outer").sort_values("fy")
    merged = merged[merged["fy"] >= 2019]

    fig2 = go.Figure()
    fig2.add_trace(go.Bar(
        x=merged["fy"].astype(str),
        y=merged["revenue"] / 1e6,
        name="Actual Revenue (£m)", marker_color="green", opacity=0.7,
    ))
    fig2.add_trace(go.Scatter(
        x=merged["fy"].astype(str),
        y=merged["projected_revenue_gbp"] / 1e6,
        name="Model Projection (£m)",
        mode="lines+markers",
        line=dict(color="red", dash="dot", width=2),
    ))
    fig2.update_layout(
        xaxis_title="Financial Year",
        yaxis_title="£m",
        legend=dict(orientation="h"),
        height=420,
        hovermode="x unified",
    )
    st.plotly_chart(fig2, use_container_width=True)

    st.caption(
        "⚠️ Model projection uses constant £108k/case assumption. "
        "Actual revenue per case has ranged £96k–£204k since FY19."
    )

    # Show numbers
    st.dataframe(
        merged.rename(columns={
            "fy": "FY",
            "revenue": "Actual £",
            "projected_revenue_gbp": "Projected £ (model)",
        }).set_index("FY"),
        use_container_width=True,
    )

# ── Tab 3: Share price ─────────────────────────────────────────────────────
with tab3:
    st.subheader("MANO.L Share Price (GBX)")
    if price.empty:
        st.info("Run `python ingest/mano_price.py` to load price data.")
    else:
        fig3 = go.Figure()
        fig3.add_trace(go.Scatter(
            x=price["date"], y=price["close"],
            name="MANO.L", line=dict(color="navy", width=1.5),
            fill="tozeroy", fillcolor="rgba(0,0,128,0.07)",
        ))
        fig3.add_hline(y=562.5, line_dash="dot", line_color="red",
                       annotation_text="2019 ATH 562.5p")
        fig3.update_layout(
            xaxis_title="", yaxis_title="GBX (pence)",
            height=420, hovermode="x unified",
        )
        st.plotly_chart(fig3, use_container_width=True)
        st.caption("Red dotted line = 2019 all-time high (562.5p)")

st.divider()
st.caption(
    "Data: Insolvency Service · yfinance · MANO RNS | "
    "Model assumptions in `model/pipeline.py` | "
    "Not financial advice."
)
