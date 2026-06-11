"""
dashboard_utils.py
Shared helpers for the MANO Tracker multi-page dashboard.

Design system: dark financial-terminal aesthetic.
  - background  : deep slate (#0b0f17)
  - accent      : cyan (#22d3ee)
  - scenario semantics (used EVERYWHERE):
        bear = red (#ef4444), base = blue (#3b82f6), bull = green (#22c55e)

All database reads are cached with st.cache_data. The dashboard NEVER
recomputes model logic — it imports from model/pipeline.py.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio
import streamlit as st

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "tracker.db"

# ── palette ────────────────────────────────────────────────────────────────
COLORS = {
    "bg":        "#0b0f17",
    "panel":     "#131a26",
    "panel2":    "#1b2433",
    "grid":      "#243044",
    "text":      "#e2e8f0",
    "muted":     "#7c8aa3",
    "accent":    "#22d3ee",
    "amber":     "#f59e0b",
    "bear":      "#ef4444",
    "base":      "#3b82f6",
    "bull":      "#22c55e",
    "cvl":       "#3b82f6",
    "compulsory":"#f59e0b",
    "admin":     "#a855f7",
}

SCENARIO_COLORS = {"bear": COLORS["bear"], "base": COLORS["base"], "bull": COLORS["bull"]}
SCENARIO_LABELS = {"bear": "Pesimistický", "base": "Základný", "bull": "Optimistický"}

# ── plotly template ────────────────────────────────────────────────────────
_template = go.layout.Template()
_template.layout = go.Layout(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="ui-monospace, SFMono-Regular, Menlo, monospace",
              color=COLORS["text"], size=13),
    colorway=[COLORS["accent"], COLORS["amber"], COLORS["bull"],
              COLORS["base"], COLORS["admin"], COLORS["bear"]],
    xaxis=dict(gridcolor=COLORS["grid"], zerolinecolor=COLORS["grid"],
               linecolor=COLORS["grid"]),
    yaxis=dict(gridcolor=COLORS["grid"], zerolinecolor=COLORS["grid"],
               linecolor=COLORS["grid"]),
    legend=dict(orientation="h", yanchor="top", y=-0.18, xanchor="center", x=0.5,
                bgcolor="rgba(0,0,0,0)"),
    margin=dict(l=60, r=30, t=50, b=90),
    hovermode="x unified",
    hoverlabel=dict(bgcolor=COLORS["panel2"], font_size=12,
                    font_family="ui-monospace, monospace"),
)
pio.templates["mano"] = _template


def style_fig(fig: go.Figure, *, title: str | None = None, height: int = 440,
              source: str | None = None) -> go.Figure:
    """Apply the house template + optional title and source caption."""
    fig.update_layout(template="mano", height=height)
    if title:
        fig.update_layout(title=dict(text=title, x=0.01, xanchor="left",
                                     font=dict(size=15, color=COLORS["text"])))
    if source:
        fig.add_annotation(
            text=f"Zdroj: {source}", xref="paper", yref="paper",
            x=0, y=-0.28, showarrow=False, xanchor="left",
            font=dict(size=10, color=COLORS["muted"]),
        )
    return fig


# ── global CSS ─────────────────────────────────────────────────────────────
def inject_css() -> None:
    st.markdown(f"""
    <style>
      .stApp {{ background:{COLORS['bg']}; }}
      section[data-testid="stSidebar"] {{ background:{COLORS['panel']}; border-right:1px solid {COLORS['grid']}; }}
      h1,h2,h3,h4 {{ font-family: ui-monospace, monospace !important; letter-spacing:-.5px; }}
      .block-container {{ padding-top:2.2rem; max-width:1280px; }}

      /* KPI cards */
      .kpi-grid {{ display:flex; gap:14px; flex-wrap:wrap; margin:.4rem 0 1rem 0; }}
      .kpi {{ flex:1; min-width:170px; background:linear-gradient(160deg,{COLORS['panel']},{COLORS['panel2']});
              border:1px solid {COLORS['grid']}; border-radius:12px; padding:14px 16px; }}
      .kpi .lbl {{ color:{COLORS['muted']}; font-size:.72rem; text-transform:uppercase; letter-spacing:.7px; }}
      .kpi .val {{ color:{COLORS['text']}; font-size:1.65rem; font-weight:700; margin-top:4px; line-height:1.1; }}
      .kpi .sub {{ font-size:.8rem; margin-top:3px; }}
      .up   {{ color:{COLORS['bull']}; }} .down {{ color:{COLORS['bear']}; }} .flat {{ color:{COLORS['muted']}; }}

      /* activity feed */
      .feed {{ border-left:2px solid {COLORS['grid']}; padding-left:14px; margin-top:.3rem; }}
      .feed-item {{ padding:7px 0; border-bottom:1px solid {COLORS['panel2']}; }}
      .feed-item .when {{ color:{COLORS['muted']}; font-size:.72rem; }}
      .feed-item .what {{ color:{COLORS['text']}; font-size:.9rem; }}
      .tag {{ font-size:.66rem; padding:1px 7px; border-radius:6px; margin-left:6px; }}
      .tag-pet {{ background:rgba(245,158,11,.15); color:{COLORS['amber']}; border:1px solid rgba(245,158,11,.4); }}
      .tag-liq {{ background:rgba(59,130,246,.15); color:{COLORS['base']}; border:1px solid rgba(59,130,246,.4); }}
      .tag-jud {{ background:rgba(168,85,247,.15); color:{COLORS['admin']}; border:1px solid rgba(168,85,247,.4); }}

      .pill {{ display:inline-block; padding:2px 10px; border-radius:20px; font-size:.7rem;
               border:1px solid {COLORS['grid']}; color:{COLORS['muted']}; }}
      [data-testid="stMetricValue"] {{ font-family: ui-monospace, monospace; }}
    </style>
    """, unsafe_allow_html=True)


def page_header(title: str, subtitle: str = "") -> None:
    st.markdown(
        f"<h1 style='margin-bottom:0'>{title}</h1>"
        f"<div style='color:{COLORS['muted']};font-size:.92rem;margin-bottom:1rem'>{subtitle}</div>",
        unsafe_allow_html=True,
    )


def kpi_cards(cards: list[dict]) -> None:
    """cards = [{label, value, sub, dir}], dir in up/down/flat."""
    html = "<div class='kpi-grid'>"
    for c in cards:
        d = c.get("dir", "flat")
        sub = f"<div class='sub {d}'>{c['sub']}</div>" if c.get("sub") else ""
        html += (f"<div class='kpi'><div class='lbl'>{c['label']}</div>"
                 f"<div class='val'>{c['value']}</div>{sub}</div>")
    html += "</div>"
    st.markdown(html, unsafe_allow_html=True)


# ── empty-state guard ──────────────────────────────────────────────────────
def require_table(df: pd.DataFrame, table: str, script: str) -> bool:
    """Returns True if data present; otherwise renders an instruction box."""
    if df is None or df.empty:
        st.warning(
            f"**Tabuľka `{table}` je prázdna.**\n\n"
            f"Spusti ingest skript:\n```bash\npython ingest/{script}\n```"
        )
        return False
    return True


# ── cached database readers ────────────────────────────────────────────────
def _read(query: str, parse_dates=None) -> pd.DataFrame:
    if not DB_PATH.exists():
        return pd.DataFrame()
    conn = sqlite3.connect(DB_PATH)
    try:
        return pd.read_sql(query, conn, parse_dates=parse_dates)
    except Exception:
        return pd.DataFrame()
    finally:
        conn.close()


@st.cache_data(ttl=3600)
def get_insolvencies_monthly() -> pd.DataFrame:
    return _read("SELECT * FROM insolvencies_monthly ORDER BY date", parse_dates=["date"])


@st.cache_data(ttl=3600)
def get_market() -> pd.DataFrame:
    """
    Monthly insolvencies WITH the derived mano_market / mano_market_weighted
    columns the pipeline needs. Delegates to model.pipeline.load_insolvencies
    so the dashboard never re-derives the market definition.
    """
    from model.pipeline import load_insolvencies, DB_PATH as PIPE_DB
    if not PIPE_DB.exists():
        return pd.DataFrame()
    try:
        return load_insolvencies(PIPE_DB)
    except Exception:
        return pd.DataFrame()


def extend_market_future(df: pd.DataFrame, months: int = 24) -> pd.DataFrame:
    """
    Append `months` of future, market-free rows after the last observed month.

    The pipeline shifts already-observed investments forward by the case+cash
    lag (~25 months). Without future date rows those projected cash months fall
    off the end of the frame, so the FY projection stops at the last data year.
    Extending the date axis lets build_pipeline place that *already-known* cash
    into future months — turning the model into a genuine forward projection
    (e.g. FY2027 cash from 2024–25 investments). Future rows carry zero new
    market, so they add no fabricated future insolvencies — only the tail of
    cash already in the pipeline.
    """
    if df.empty:
        return df
    last = df["date"].max()
    future_dates = pd.date_range(
        last + pd.DateOffset(months=1), periods=months, freq="MS"
    )
    future = pd.DataFrame({"date": future_dates})
    for col in df.columns:
        if col != "date":
            future[col] = 0.0
    return pd.concat([df, future], ignore_index=True)


@st.cache_data(ttl=3600)
def get_record_level() -> pd.DataFrame:
    return _read("SELECT * FROM insolvencies_record_level")


@st.cache_data(ttl=3600)
def get_companies_house() -> pd.DataFrame:
    return _read("SELECT * FROM companies_house_profiles")


@st.cache_data(ttl=3600)
def get_gazette() -> pd.DataFrame:
    return _read("SELECT * FROM gazette_notices ORDER BY date DESC")


@st.cache_data(ttl=3600)
def get_judgments() -> pd.DataFrame:
    return _read("SELECT * FROM judgments ORDER BY date DESC")


@st.cache_data(ttl=3600)
def get_kpis() -> pd.DataFrame:
    return _read("SELECT * FROM mano_kpis ORDER BY fy")


@st.cache_data(ttl=3600)
def get_price() -> pd.DataFrame:
    return _read("SELECT date, close, volume FROM mano_price ORDER BY date",
                 parse_dates=["date"])


@st.cache_data(ttl=3600)
def get_table_diagnostics() -> pd.DataFrame:
    """Row counts + freshness per table for the diagnostics page."""
    specs = [
        ("insolvencies_monthly", "date"),
        ("insolvencies_record_level", "month_registered"),
        ("companies_house_profiles", "last_fetched"),
        ("gazette_notices", "date"),
        ("judgments", "date"),
        ("mano_kpis", "fy"),
        ("mano_price", "date"),
    ]
    if not DB_PATH.exists():
        return pd.DataFrame()
    conn = sqlite3.connect(DB_PATH)
    rows = []
    for tbl, datecol in specs:
        try:
            n = conn.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
            latest = conn.execute(f"SELECT MAX({datecol}) FROM {tbl}").fetchone()[0]
            rows.append({"table": tbl, "rows": n, "latest": latest})
        except Exception:
            rows.append({"table": tbl, "rows": 0, "latest": "— (chýba)"})
    conn.close()
    return pd.DataFrame(rows)


# ── sector / SIC helpers ───────────────────────────────────────────────────
SIC2_LABELS = {
    "56": "Pohostinstvo", "43": "Špec. stavebníctvo", "47": "Maloobchod",
    "82": "Admin. služby", "41": "Výstavba budov", "46": "Veľkoobchod",
    "45": "Predaj vozidiel", "68": "Reality", "49": "Pozemná doprava",
    "70": "Riadenie firiem", "62": "IT služby", "96": "Osobné služby",
    "10": "Potravinárstvo", "25": "Kovovýroba", "85": "Vzdelávanie",
    "macro": "—",
}


def sic2_label(code: str | None) -> str:
    if code is None:
        return "—"
    return SIC2_LABELS.get(str(code), f"SIC {code}")


def parse_sic_json(raw) -> list:
    try:
        return json.loads(raw) if raw else []
    except Exception:
        return []
