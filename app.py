"""
app.py
MANO Tracker — Streamlit dashboard (v0.4, SK).

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
    "Britské štatistiky platobnej neschopnosti ako ~24-mesačný predstihový indikátor pre "
    "[Manolete Partners PLC](https://www.londonstockexchange.com/stock/MANO) (LON: MANO.L)"
)

# ── pomocná funkcia pre layout grafov ─────────────────────────────────────

def chart_layout(**kwargs):
    """Spoločné nastavenia layoutu — legenda pod grafom, dostatočné okraje."""
    base = dict(
        legend=dict(
            orientation="h",
            yanchor="top",
            y=-0.18,
            xanchor="center",
            x=0.5,
        ),
        margin=dict(l=60, r=30, t=40, b=100),
        hovermode="x unified",
        height=460,
    )
    base.update(kwargs)
    return base


# ── načítanie dát ──────────────────────────────────────────────────────────

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
    results = {}
    for s in ("bear", "base", "bull"):
        pipe = build_pipeline(ins, scenario=s)
        results[s] = projected_fy_revenue(pipe)
    base_monthly = build_pipeline(ins, scenario="base")
    return results, base_monthly


# ── načítanie ──────────────────────────────────────────────────────────────

ins   = get_insolvencies()
price = get_price()
kpis  = get_kpis()

if ins.empty:
    st.warning("Žiadne dáta. Spusti najprv `python ingest/insolvency_stats.py`.")
    st.stop()

scenario_fy, base_monthly = get_all_scenarios(ins)

# ── KPI karty ──────────────────────────────────────────────────────────────

latest      = ins[ins["mano_market"].notna()].iloc[-1]
latest_date = latest["date"].strftime("%b %Y")
rolling_12m = ins.tail(12)["mano_market"].sum()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Posledný mesiac CVL+nud.", f"{int(latest['mano_market']):,}", latest_date)
col2.metric("Kĺzavý súčet 12 mes.", f"{int(rolling_12m):,}")

if not price.empty:
    lp = price.iloc[-1]
    col3.metric("MANO.L (GBX)", f"{lp['close']:.1f}p", lp["date"].strftime("%d %b %Y"))

if not kpis.empty:
    last_fy = kpis.iloc[-1]
    col4.metric(
        f"FY{int(last_fy['fy'])} Tržby",
        f"£{last_fy['revenue']/1e6:.1f}m",
        f"{int(last_fy['cases_completed'])} prípadov",
    )

st.divider()

# ── záložky ────────────────────────────────────────────────────────────────

tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Pipeline platobnej neschopnosti",
    "📈 Projekcia tržieb",
    "💷 Cena akcie MANO.L",
    "⚙️ Parametre modelu",
])

# ── ZÁLOŽKA 1 ──────────────────────────────────────────────────────────────
with tab1:
    st.subheader("Mesačné likvidácie spoločností — Anglicko & Wales (od 2019)")

    ins_plot = ins[ins["date"] >= "2019-01-01"].copy()
    ins_plot["roll12_raw"]      = ins_plot["mano_market"].rolling(12).mean()
    ins_plot["roll12_weighted"] = ins_plot["mano_market_weighted"].rolling(12).mean()

    fig1 = go.Figure()

    fig1.add_trace(go.Bar(
        x=ins_plot["date"], y=ins_plot["cvl"],
        name="CVL (dobrovoľná likvidácia veriteľmi)",
        marker_color="steelblue", opacity=0.75,
    ))
    fig1.add_trace(go.Bar(
        x=ins_plot["date"], y=ins_plot["compulsory"],
        name="Núdená likvidácia (súdna)",
        marker_color="darkorange", opacity=0.85,
    ))
    fig1.add_trace(go.Scatter(
        x=ins_plot["date"], y=ins_plot["roll12_raw"],
        name="12-mes. kĺzavý priemer (surový)",
        line=dict(color="crimson", width=2),
    ))
    fig1.add_trace(go.Scatter(
        x=ins_plot["date"], y=ins_plot["roll12_weighted"],
        name="12-mes. kĺzavý priemer (vážený)",
        line=dict(color="purple", width=2, dash="dot"),
    ))

    fig1.update_layout(
        barmode="stack",
        xaxis_title="",
        yaxis_title="Počet spoločností",
        **chart_layout(),
    )
    st.plotly_chart(fig1, use_container_width=True)

    with st.expander("Čo je vážený trh?"):
        st.markdown(f"""
        **Surový trh** = CVL + núdené likvidácie (rovnaká váha).

        **Vážený trh** = CVL + núdené likvidácie × **{COMPULSORY_WEIGHT}** — núdené likvidácie
        sú nariadené súdom (často petície HMRC) a zvyčajne obsahujú reálnejšie a vyššie
        pohľadávky než "prázdne" CVL prípady. Každá núdená likvidácia sa preto počíta
        ako viac v adresovateľnom trhu MANO.
        """)

    with st.expander("Ako toto ovplyvňuje MANO?"):
        st.markdown(f"""
        ~**{REFERRAL_RATE*100:.2f}%** mesačného váženého trhu sa dostane k MANO ako dopyt (referral).

        ~**{ACCEPTANCE_RATE*100:.0f}%** dopytov je prijatých → nové investície do prípadov.

        Ukončenie prípadu zaostáva ~**{CASE_LAG_MONTHS} mesiacov** od investície,
        inkaso hotovosti ďalších ~**{CASH_LAG_MONTHS} mesiacov**.

        Kapacitný strop: **{ANNUAL_INVESTMENT_CAP} investícií/rok** ({MONTHLY_INVESTMENT_CAP:.1f}/mesiac).
        """)

# ── ZÁLOŽKA 2 ──────────────────────────────────────────────────────────────
with tab2:
    st.subheader("Projektované vs. skutočné tržby MANO podľa fiškálneho roka (apr–mar)")

    bear_fy = scenario_fy["bear"][["fy", "projected_revenue_gbp"]].rename(
        columns={"projected_revenue_gbp": "bear_rev"})
    base_fy = scenario_fy["base"][
        ["fy", "projected_revenue_gbp", "projected_revenue_low", "projected_revenue_high"]
    ].rename(columns={"projected_revenue_gbp": "base_rev"})
    bull_fy = scenario_fy["bull"][["fy", "projected_revenue_gbp"]].rename(
        columns={"projected_revenue_gbp": "bull_rev"})

    merged = (
        base_fy
        .merge(bear_fy, on="fy", how="outer")
        .merge(bull_fy, on="fy", how="outer")
        .merge(kpis[["fy", "revenue"]], on="fy", how="outer")
        .sort_values("fy")
    )
    merged = merged[merged["fy"] >= 2019].reset_index(drop=True)
    fy_str = merged["fy"].astype(str)

    fig2 = go.Figure()

    # Pás neistoty lagov (low/high základného scenára)
    high_vals = merged["projected_revenue_high"].fillna(0) / 1e6
    low_vals  = merged["projected_revenue_low"].fillna(0) / 1e6
    fig2.add_trace(go.Scatter(
        x=list(fy_str) + list(fy_str)[::-1],
        y=list(high_vals) + list(low_vals)[::-1],
        fill="toself",
        fillcolor="rgba(70,130,180,0.13)",
        line=dict(color="rgba(0,0,0,0)"),
        name="Pásmo neistoty lagu (základ ±6 mes.)",
        hoverinfo="skip",
    ))

    # Skutočné tržby — bary
    fig2.add_trace(go.Bar(
        x=fy_str,
        y=merged["revenue"] / 1e6,
        name="Skutočné tržby (£m)",
        marker_color="mediumseagreen",
        opacity=0.8,
        width=0.4,
    ))

    # Scenárové línie — oddelené od barov pomocou type=scatter
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["bear_rev"] / 1e6,
        name=f"Pesimistický (£{REV_PER_CASE_SCENARIOS['bear']//1000}k/prípad)",
        mode="lines+markers",
        line=dict(color="firebrick", dash="dash", width=2),
        marker=dict(size=6),
    ))
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["base_rev"] / 1e6,
        name=f"Základný (£{REV_PER_CASE_SCENARIOS['base']//1000}k/prípad)",
        mode="lines+markers",
        line=dict(color="steelblue", width=2.5),
        marker=dict(size=6),
    ))
    fig2.add_trace(go.Scatter(
        x=fy_str, y=merged["bull_rev"] / 1e6,
        name=f"Optimistický (£{REV_PER_CASE_SCENARIOS['bull']//1000}k/prípad)",
        mode="lines+markers",
        line=dict(color="seagreen", dash="dot", width=2),
        marker=dict(size=6),
    ))

    fig2.update_layout(
        xaxis_title="Fiškálny rok (apr–mar)",
        yaxis_title="£m",
        **chart_layout(height=480),
    )
    st.plotly_chart(fig2, use_container_width=True)

    st.caption(
        f"**Pesimistický** — dominujú CVL/SME prípady, málo veľkých vyrovnaní "
        f"(£{REV_PER_CASE_SCENARIOS['bear']//1000}k priem. tržba/prípad).  "
        f"**Základný** — referenčná hodnota FY25 bez Bounce-Back-Loan "
        f"(£{REV_PER_CASE_SCENARIOS['base']//1000}k).  "
        f"**Optimistický** — návrat veľkých administratívnych prípadov "
        f"(£{REV_PER_CASE_SCENARIOS['bull']//1000}k).  "
        "Tieňované pásmo = rovnaké predpoklady základného scenára, lag posunutý ±6 mesiacov."
    )

    with st.expander("Zobraziť číselné hodnoty"):
        display = merged.copy()
        for col in ["revenue", "bear_rev", "base_rev", "bull_rev",
                    "projected_revenue_low", "projected_revenue_high"]:
            if col in display.columns:
                display[col] = (display[col] / 1e6).round(1)
        display = display.rename(columns={
            "fy": "FY",
            "revenue": "Skutočné £m",
            "bear_rev": "Pesim. £m",
            "base_rev": "Základ. £m",
            "bull_rev": "Optim. £m",
            "projected_revenue_low": "Základ nízky £m",
            "projected_revenue_high": "Základ vysoký £m",
        }).set_index("FY")
        st.dataframe(display, use_container_width=True)

# ── ZÁLOŽKA 3 ──────────────────────────────────────────────────────────────
with tab3:
    st.subheader("Cena akcie MANO.L (GBX — pence)")
    if price.empty:
        st.info("Spusti `python ingest/mano_price.py` pre načítanie kurzových dát.")
    else:
        fig3 = go.Figure()
        fig3.add_trace(go.Scatter(
            x=price["date"], y=price["close"],
            name="MANO.L",
            line=dict(color="navy", width=1.5),
            fill="tozeroy", fillcolor="rgba(0,0,128,0.07)",
        ))
        fig3.add_hline(
            y=562.5, line_dash="dot", line_color="red",
            annotation_text="ATH 2019: 562,5p",
            annotation_position="top right",
        )
        fig3.update_layout(
            xaxis_title="",
            yaxis_title="GBX (pence)",
            **chart_layout(height=440),
        )
        st.plotly_chart(fig3, use_container_width=True)
        st.caption("Červená prerušovaná čiara = historické maximum z roku 2019 (562,5p)")

# ── ZÁLOŽKA 4 ──────────────────────────────────────────────────────────────
with tab4:
    st.subheader("Aktuálne parametre modelu")
    st.caption("Všetky hodnoty sú definované v `model/pipeline.py` a dajú sa tam zmeniť.")

    params = pd.DataFrame([
        ("referral_rate",
         f"{REFERRAL_RATE*100:.2f}%",
         "Podiel mesačného trhu (CVL+núd.), ktorý sa dostane k MANO ako dopyt"),
        ("acceptance_rate",
         f"{ACCEPTANCE_RATE*100:.0f}%",
         "Podiel dopytov prijatých ako nové investície do prípadov"),
        ("compulsory_weight",
         f"{COMPULSORY_WEIGHT:.2f}×",
         "Násobiteľ núdených likvidácií voči CVL (vyššia hodnota pohľadávky)"),
        ("case_lag_months",
         f"{CASE_LAG_MONTHS} mes.",
         "Centrálny lag: investícia → ukončenie prípadu"),
        ("cash_lag_months",
         f"{CASH_LAG_MONTHS} mes.",
         "Centrálny lag: ukončenie → inkaso hotovosti"),
        ("lag_uncertainty",
         f"±{LAG_UNCERTAINTY} mes.",
         "Aplikuje sa na celkový lag pre pásmo low/high projekcie"),
        ("annual_investment_cap",
         f"{ANNUAL_INVESTMENT_CAP}/rok  ({MONTHLY_INVESTMENT_CAP:.1f}/mes.)",
         "Kapacitný strop upisovacieho tímu MANO"),
        ("ARRCC — pesimistický",
         f"£{REV_PER_CASE_SCENARIOS['bear']:,}",
         "Priem. realizovaná tržba/prípad — pesimistický scenár"),
        ("ARRCC — základný",
         f"£{REV_PER_CASE_SCENARIOS['base']:,}",
         "Priem. realizovaná tržba/prípad — základný scenár (FY25 bez BBL)"),
        ("ARRCC — optimistický",
         f"£{REV_PER_CASE_SCENARIOS['bull']:,}",
         "Priem. realizovaná tržba/prípad — optimistický scenár"),
    ], columns=["Parameter", "Hodnota", "Popis"])

    st.dataframe(params.set_index("Parameter"), use_container_width=True)

st.divider()
st.caption(
    "Zdroje: Insolvency Service · yfinance · MANO RNS | "
    "Parametre modelu: `model/pipeline.py` | "
    "Nie je to investičné poradenstvo."
)
