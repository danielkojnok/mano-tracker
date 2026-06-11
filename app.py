"""
app.py
MANO Tracker — Streamlit dashboard (v0.3).

Run locally:  streamlit run app.py
"""

import sqlite3
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from model.pipeline import (
    REV_PER_CASE_SCENARIOS,
    REFERRAL_RATE,
    ACCEPTANCE_RATE,
    COMPULSORY_WEIGHT,
    CASE_LAG_MONTHS,
    CASH_LAG_MONTHS,
    LAG_UNCERTAINTY,
    MONTHLY_INVESTMENT_CAP,
    ANNUAL_INVESTMENT_CAP,
    build_pipeline,
    projected_fy_revenue,
    load_insolvencies,
)

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

# ── data loaders ───────────────────────────────────────────────────────────

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


@st.cache_data(ttl=3600)
def get_all_scenarios(ins: pd.DataFrame):
    """Build pipeline for all three scenarios; return FY-level projections."""
    results = {}
    for s in ("bear", "base", "bull"):
        pipe = build_pipeline(ins, scenario=s)
        results[s] = projected_fy_revenue(pipe)
    # Also return base monthly pipeline for the lag band columns
    base_monthly = build_pipeline(ins, scenario="base")
    return results, base_monthly


# ── load data ──────────────────────────────────────────────────────────────
ins   = get_insolvencies()
price = get_price()
kpis  = get_kpis()

if ins.empty:
    st.warning("No insolvency data yet. Run `python ingest/insolvency_stats.py` first.")
    st.stop()

scenario_fy, base_monthly = get_all_scenarios(ins)

# ── KPI cards ──────────────────────────────────────────────────────────────
latest      = ins[ins["mano_market"].notna()].iloc[-1]
latest_date = latest["date"].strftime("%b %Y")
rolling_12m = ins.tail(12)["mano_market"].sum()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Latest month CVL+Comp", f"{int(latest['mano_market']):,}", latest_date)
col2.metric("12-month rolling total", f"{int(rolling_12m):,}")

if not price.empty:
    lp = price.iloc[-1]
    col3.metric("MANO.L (GBX)", f"{lp['close']:.1f}p", lp["date"].strftime("%d %b %Y"))

if not kpis.empty:
    last_fy = kpis.iloc[-1]
    col4.metric(
        f"FY{int(last_fy['fy'])} Revenue",
        f"£{last_fy['revenue']/1e6:.1f}m",
        f"{int(last_fy['cases_completed'])} cases",
    )

st.divider()

# ── tabs ───────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Insolvency Pipeline",
    "📈 Revenue Projection",
    "💷 MANO.L Price",
    "⚙️ Model Assumptions",
])

# ── TAB 1: Insolvency Pipeline ─────────────────────────────────────────────
with tab1:
    st.subheader("Monthly Insolvencies — England & Wales (from 2019)")

    ins_plot = ins[ins["date"] >= "2019-01-01"].copy()
    ins_plot["roll12"] = ins_plot["mano_market"].rolling(12).mean()

    fig1 = go.Figure()

    fig1.add_trace(go.Bar(
        x=ins_plot["date"], y=ins_plot["cvl"],
        name="CVL", marker_color="steelblue", opacity=0.75,
    ))
    fig1.add_trace(go.Bar(
        x=ins_plot["date"], y=ins_plot["compulsory"],
        name="Compulsory", marker_color="darkorange", opacity=0.85,
    ))
    fig1.add_trace(go.Scatter(
        x=ins_plot["date"], y=ins_plot["roll12"],
        name="12-month rolling avg (raw)",
        line=dict(color="crimson", width=2),
        yaxis="y",
    ))
    fig1.add_trace(go.Scatter(
        x=ins_plot["date"], y=ins_plot["mano_market_weighted"].rolling(12).mean(),
        name="12-month rolling avg (weighted)",
        line=dict(color="purple", width=2, dash="dot"),
        yaxis="y",
    ))

    fig1.update_layout(
        barmode="stack",
        xaxis_title="",
        yaxis_title="Companies",
        legend=dict(orientation="h"),
        height=440,
        hovermode="x unified",
    )
    st.plotly_chart(fig1, use_container_width=True)

    with st.expander("What is weighted market?"):
        st.markdown(f"""
        **Raw market** = CVL + compulsory (equal weight).
        **Weighted market** = CVL + compulsory × **{COMPULSORY_WEIGHT}** — compulsory
        liquidations are court-ordered (often HMRC petitions) and tend to carry more
        recoverable claims than "empty box" CVLs, so each counts for more in MANO's
        addressable deal flow.
        """)

    with st.expander("How this feeds MANO"):
        st.markdown(f"""
        ~**{REFERRAL_RATE*100:.2f}%** of monthly weighted CVL + compulsory reach MANO as enquiries.
        ~**{ACCEPTANCE_RATE*100:.0f}%** of enquiries are accepted → new case investments.
        Completions lag ~**{CASE_LAG_MONTHS} months**, cash collection a further ~**{CASH_LAG_MONTHS} months**.
        Capacity cap: **{ANNUAL_INVESTMENT_CAP} investments/yr** ({MONTHLY_INVESTMENT_CAP:.1f}/month).
        """)

# ── TAB 2: Revenue Projection ──────────────────────────────────────────────
with tab2:
    st.subheader("Projected vs. Actual MANO Revenue by Financial Year (Apr–Mar)")

    # Build a merged table with actuals + all three scenario projections
    bear_fy = scenario_fy["bear"][["fy", "projected_revenue_gbp"]].rename(
        columns={"projected_revenue_gbp": "bear_rev"})
    base_fy = scenario_fy["base"][["fy", "projected_revenue_gbp", "projected_revenue_low", "projected_revenue_high"]].rename(
        columns={"projected_revenue_gbp": "base_rev"})
    bull_fy = scenario_fy["bull"][["fy", "projected_revenue_gbp"]].rename(
        columns={"projected_revenue_gbp": "bull_rev"})

    merged = (
        base_fy
        .merge(bear_fy, on="fy", how="outer")
        .merge(bull_fy, on="fy", how="outer")
        .merge(kpis[["fy", "revenue"]], on="fy", how="outer")
        .sort_values("fy")
    )
    merged = merged[merged["fy"] >= 2019]
    fy_str = merged["fy"].astype(str)

    fig2 = go.Figure()

    # Lag uncertainty band (base scenario low/high)
    fig2.add_trace(go.Scatter(
        x=pd.concat([fy_str, fy_str.iloc[::-1]]),
        y=pd.concat([
            merged["projected_revenue_high"] / 1e6,
            merged["projected_revenue_low"].iloc[::-1] / 1e6,
        ]),
        fill="toself",
        fillcolor="rgba(70,130,180,0.12)",
        line=dict(color="rgba(0,0,0,0)"),
        name="Lag uncertainty band (base ±6m)",
        showlegend=True,
        hoverinfo="skip",
    ))

    # Actual revenue bars
    fig2.add_trace(go.Bar(
        x=fy_str,
        y=merged["revenue"] / 1e6,
        name="Actual Revenue",
        marker_color="mediumseagreen",
        opacity=0.75,
    ))

    # Bear line
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["bear_rev"] / 1e6,
        name=f"Bear (£{REV_PER_CASE_SCENARIOS['bear']//1000}k/case)",
        mode="lines+markers",
        line=dict(color="firebrick", dash="dash", width=2),
    ))

    # Base line
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["base_rev"] / 1e6,
        name=f"Base (£{REV_PER_CASE_SCENARIOS['base']//1000}k/case)",
        mode="lines+markers",
        line=dict(color="steelblue", width=2.5),
    ))

    # Bull line
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["bull_rev"] / 1e6,
        name=f"Bull (£{REV_PER_CASE_SCENARIOS['bull']//1000}k/case)",
        mode="lines+markers",
        line=dict(color="seagreen", dash="dot", width=2),
    ))

    fig2.update_layout(
        xaxis_title="Financial Year (Apr–Mar)",
        yaxis_title="£m",
        legend=dict(orientation="h"),
        height=460,
        hovermode="x unified",
        barmode="overlay",
    )
    st.plotly_chart(fig2, use_container_width=True)

    st.caption(
        "**Bear** — CVL/SME mix dominates, few large settlements "
        f"(£{REV_PER_CASE_SCENARIOS['bear']//1000}k avg revenue per completed case).  "
        "**Base** — FY25 audited ex-Bounce-Back-Loan baseline "
        f"(£{REV_PER_CASE_SCENARIOS['base']//1000}k).  "
        "**Bull** — return of large administration cases to the mix "
        f"(£{REV_PER_CASE_SCENARIOS['bull']//1000}k).  "
        "Shaded band = same base assumptions but lag shifted ±6 months."
    )

    with st.expander("Show numbers"):
        display = merged.copy()
        for col in ["revenue", "bear_rev", "base_rev", "bull_rev",
                    "projected_revenue_low", "projected_revenue_high"]:
            if col in display.columns:
                display[col] = (display[col] / 1e6).round(1)
        display = display.rename(columns={
            "fy": "FY",
            "revenue": "Actual £m",
            "bear_rev": "Bear £m",
            "base_rev": "Base £m",
            "bull_rev": "Bull £m",
            "projected_revenue_low": "Base low £m",
            "projected_revenue_high": "Base high £m",
        }).set_index("FY")
        st.dataframe(display, use_container_width=True)

# ── TAB 3: Share price ─────────────────────────────────────────────────────
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

# ── TAB 4: Model Assumptions ───────────────────────────────────────────────
with tab4:
    st.subheader("Current Model Parameters")
    st.caption("All values are defined in `model/pipeline.py` and can be changed there.")

    params = pd.DataFrame([
        ("referral_rate",       f"{REFERRAL_RATE*100:.2f}%",
         "Fraction of monthly CVL+compulsory that reach MANO as enquiries"),
        ("acceptance_rate",     f"{ACCEPTANCE_RATE*100:.0f}%",
         "Fraction of enquiries accepted as new case investments"),
        ("compulsory_weight",   f"{COMPULSORY_WEIGHT:.2f}×",
         "Multiplier applied to compulsory liquidations vs CVL (higher claim value)"),
        ("case_lag_months",     f"{CASE_LAG_MONTHS} months",
         "Central lag: investment → case completion"),
        ("cash_lag_months",     f"{CASH_LAG_MONTHS} months",
         "Central lag: completion → cash collected"),
        ("lag_uncertainty",     f"±{LAG_UNCERTAINTY} months",
         "Applied to total lag for the low/high projection band"),
        ("annual_investment_cap", f"{ANNUAL_INVESTMENT_CAP}/yr ({MONTHLY_INVESTMENT_CAP:.1f}/mo)",
         "Capacity ceiling on MANO's underwriting team"),
        ("ARRCC — bear",        f"£{REV_PER_CASE_SCENARIOS['bear']:,}",
         "Avg realised revenue per completed case — bear scenario"),
        ("ARRCC — base",        f"£{REV_PER_CASE_SCENARIOS['base']:,}",
         "Avg realised revenue per completed case — base scenario (FY25 ex-BBL)"),
        ("ARRCC — bull",        f"£{REV_PER_CASE_SCENARIOS['bull']:,}",
         "Avg realised revenue per completed case — bull scenario"),
    ], columns=["Parameter", "Value", "Description"])

    st.dataframe(params.set_index("Parameter"), use_container_width=True)

st.divider()
st.caption(
    "Data: Insolvency Service · yfinance · MANO RNS | "
    "Model assumptions in `model/pipeline.py` | "
    "Not financial advice."
)
