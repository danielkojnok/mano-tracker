"""
ingest/export_frontend_data.py
Export tracker.db → static JSON files for the React frontend.

Output: frontend/public/data/*.json
deps: pandas, sqlite3, json, pathlib (all already in project)
"""

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"
OUT_DIR = ROOT / "frontend" / "public" / "data"

# pipeline.py is the ONLY place model numbers are computed (R1.2).
sys.path.insert(0, str(ROOT / "model"))
from pipeline import get_overview, print_overview_chain  # noqa: E402

COMPACT = {"ensure_ascii": False, "separators": (",", ":")}


def _tables(con: sqlite3.Connection) -> set[str]:
    cur = con.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {r[0] for r in cur.fetchall()}


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── FILE 1 — kpis.json ────────────────────────────────────────────────────────

def build_kpis(con: sqlite3.Connection, insolvencies_12m_override: int | None = None) -> dict:
    tbls = _tables(con)
    now = _now()

    # insolvencies last 12m and prior-year 12m
    ins_12m = ins_prev_12m = None
    for tbl in ("insolvencies_monthly", "insolvencies_record_level"):
        if tbl not in tbls:
            continue
        try:
            if tbl == "insolvencies_monthly":
                df = pd.read_sql(
                    "SELECT date, cvl, compulsory FROM insolvencies_monthly"
                    " ORDER BY date DESC",
                    con,
                    parse_dates=["date"],
                )
                df = df.dropna(subset=["date"]).sort_values("date")
                df["total"] = df["cvl"].fillna(0) + df["compulsory"].fillna(0)
                cutoff = df["date"].max() - pd.DateOffset(months=12)
                prev_cutoff = cutoff - pd.DateOffset(months=12)
                ins_12m = int(df[df["date"] > cutoff]["total"].sum())
                ins_prev_12m = int(
                    df[(df["date"] > prev_cutoff) & (df["date"] <= cutoff)]["total"].sum()
                )
            else:
                df = pd.read_sql(
                    "SELECT month_registered, is_cvl, is_compulsory"
                    " FROM insolvencies_record_level",
                    con,
                    parse_dates=["month_registered"],
                )
                df = df.dropna(subset=["month_registered"])
                df["total"] = (
                    df["is_cvl"].fillna(0) + df["is_compulsory"].fillna(0)
                )
                df_m = (
                    df.groupby(pd.Grouper(key="month_registered", freq="MS"))["total"]
                    .sum()
                    .reset_index()
                    .rename(columns={"month_registered": "date"})
                )
                df_m = df_m.sort_values("date")
                cutoff = df_m["date"].max() - pd.DateOffset(months=12)
                prev_cutoff = cutoff - pd.DateOffset(months=12)
                ins_12m = int(df_m[df_m["date"] > cutoff]["total"].sum())
                ins_prev_12m = int(
                    df_m[
                        (df_m["date"] > prev_cutoff) & (df_m["date"] <= cutoff)
                    ]["total"].sum()
                )
            break
        except Exception:
            ins_12m = ins_prev_12m = None

    if ins_12m is None:
        ins_12m, ins_prev_12m = 25_600, 25_000

    # Single source of truth: if pipeline.get_overview() computed the trailing
    # 12-month figure, use exactly that so ticker / KPI card / funnel all show
    # ONE insolvency number. yoy still uses the locally-computed prior window.
    if insolvencies_12m_override is not None:
        ins_12m = insolvencies_12m_override

    yoy_pct = (
        round((ins_12m - ins_prev_12m) / ins_prev_12m * 100, 2)
        if ins_prev_12m
        else 0.0
    )

    # pipeline health
    if yoy_pct < -2:
        health, health_trend = "Klesá", "down"
    elif yoy_pct > 2:
        health, health_trend = "Rastie", "up"
    else:
        health, health_trend = "Stabilné", "neutral"

    # MANO price from DB
    mano_price, mano_change = 39.3, 0.8
    if "mano_price" in tbls:
        try:
            px = pd.read_sql(
                "SELECT date, close FROM mano_price ORDER BY date DESC LIMIT 2",
                con,
                parse_dates=["date"],
            )
            if len(px) >= 1:
                mano_price = round(float(px.iloc[0]["close"]), 2)
            if len(px) == 2:
                mano_change = round(
                    (float(px.iloc[0]["close"]) - float(px.iloc[1]["close"]))
                    / float(px.iloc[1]["close"])
                    * 100,
                    2,
                )
        except Exception:
            pass

    # FY27 revenue from mano_kpis if available, else hardcoded
    fy27_base = 32.4
    if "mano_kpis" in tbls:
        try:
            kpis = pd.read_sql("SELECT fy, revenue FROM mano_kpis", con)
            fy27 = kpis[kpis["fy"] == "FY27"]
            if not fy27.empty and pd.notna(fy27.iloc[0]["revenue"]):
                fy27_base = round(float(fy27.iloc[0]["revenue"]), 2)
        except Exception:
            pass

    return {
        "insolvencies_12m": ins_12m,
        "insolvencies_yoy_pct": yoy_pct,
        "mano_price_gbx": mano_price,
        "mano_price_change_pct": mano_change,
        "fy27_revenue_base_m": fy27_base,
        "pipeline_health": health,
        "pipeline_health_trend": health_trend,
        "pipeline_health_pct": yoy_pct,
        "generated_at": now,
    }


# ── FILE 2 — insolvency_timeseries.json ───────────────────────────────────────

def build_timeseries(con: sqlite3.Connection) -> dict:
    tbls = _tables(con)

    if "insolvencies_monthly" in tbls:
        try:
            df = pd.read_sql(
                "SELECT date, cvl, compulsory, total FROM insolvencies_monthly"
                " ORDER BY date ASC",
                con,
                parse_dates=["date"],
            )
            rows = []
            for _, r in df.iterrows():
                if pd.isna(r["date"]):
                    continue
                rows.append({
                    "date": r["date"].strftime("%Y-%m"),
                    "cvl": int(r["cvl"]) if pd.notna(r["cvl"]) else 0,
                    "compulsory": int(r["compulsory"]) if pd.notna(r["compulsory"]) else 0,
                    "total": int(r["total"]) if pd.notna(r["total"]) else 0,
                })
            return {"series": rows}
        except Exception:
            pass

    if "insolvencies_record_level" in tbls:
        try:
            df = pd.read_sql(
                "SELECT month_registered, is_cvl, is_compulsory"
                " FROM insolvencies_record_level",
                con,
                parse_dates=["month_registered"],
            )
            df = df.dropna(subset=["month_registered"])
            df["month"] = df["month_registered"].dt.to_period("M")
            agg = (
                df.groupby("month")
                .agg(cvl=("is_cvl", "sum"), compulsory=("is_compulsory", "sum"))
                .reset_index()
                .sort_values("month")
            )
            rows = []
            for _, r in agg.iterrows():
                cvl = int(r["cvl"])
                comp = int(r["compulsory"])
                rows.append({
                    "date": str(r["month"]),
                    "cvl": cvl,
                    "compulsory": comp,
                    "total": cvl + comp,
                })
            return {"series": rows}
        except Exception:
            pass

    return {"series": []}


# ── FILE 3 — ip_network.json ──────────────────────────────────────────────────

def build_ip_network(con: sqlite3.Connection) -> dict:
    tbls = _tables(con)
    now = _now()

    if "ip_network" not in tbls:
        return {"nodes": [], "meta": {"total_ips": 0, "total_cases": 0, "generated_at": now}}

    try:
        df = pd.read_sql("SELECT * FROM ip_network", con)
    except Exception:
        return {"nodes": [], "meta": {"total_ips": 0, "total_cases": 0, "generated_at": now}}

    nodes = []
    for _, r in df.iterrows():
        name = str(r["ip_name"]) if pd.notna(r["ip_name"]) else ""
        label = name[:28]
        nodes.append({
            "id": name,
            "label": label,
            "full_name": name,
            "total_cases": int(r["total_cases"]) if pd.notna(r["total_cases"]) else 0,
            "primary_region": str(r["primary_region"]) if pd.notna(r["primary_region"]) else None,
            "top_sic_1": None,
            "top_sic_pct_1": None,
            "top_sic_2": None,
            "top_sic_pct_2": None,
            "top_sic_3": None,
            "top_sic_pct_3": None,
            "sweet_spot_cases": int(r["sweet_spot_cases"]) if pd.notna(r["sweet_spot_cases"]) else 0,
            "pct_sweet_spot": round(float(r["pct_sweet_spot"]), 2) if pd.notna(r["pct_sweet_spot"]) else 0.0,
        })

    return {
        "nodes": nodes,
        "meta": {
            "total_ips": len(nodes),
            "total_cases": sum(n["total_cases"] for n in nodes),
            "generated_at": now,
        },
    }


# ── FILE 4 — gazette_recent.json ─────────────────────────────────────────────

_TYPE_MAP = {
    "liquidator_appointment": "LIKVIDÁCIA",
    "winding_up_petition": "PETÍCIA",
}


def build_gazette_recent(con: sqlite3.Connection) -> dict:
    tbls = _tables(con)

    if "gazette_notices" not in tbls:
        return {"notices": []}

    try:
        df = pd.read_sql(
            "SELECT date, company_name, notice_type, notice_type_label"
            " FROM gazette_notices ORDER BY date DESC LIMIT 50",
            con,
        )
        notices = []
        for _, r in df.iterrows():
            ntype = str(r["notice_type"]) if pd.notna(r["notice_type"]) else ""
            notices.append({
                "date": str(r["date"])[:10] if pd.notna(r["date"]) else "",
                "company_name": str(r["company_name"]) if pd.notna(r["company_name"]) else "",
                "notice_type": ntype,
                "notice_type_label": str(r["notice_type_label"]) if pd.notna(r["notice_type_label"]) else "",
                "display_type": _TYPE_MAP.get(ntype, "INÉ"),
            })
        return {"notices": notices}
    except Exception:
        return {"notices": []}


# ── FILE 5 — pipeline_assumptions.json ───────────────────────────────────────

def build_pipeline_assumptions() -> dict:
    # Parse constants from model/pipeline.py; fall back to known v0.2.1 values.
    defaults = {
        "referral_rate": 0.0425,
        "acceptance_rate": 0.30,
        "arrcc_base": 110_000,
        "arrcc_pessimistic": 95_000,
        "arrcc_optimistic": 150_000,
        "lag_months_base": 25,
        "lag_months_bear": 34,
        "lag_months_bull": 21,
        "compulsory_weight": 1.25,
        "fy27_base": 33.8,
        "fy27_pessimistic": 28.0,
        "fy27_optimistic": 45.0,
        "model_version": "v0.2.1",
        "calibrated_at": "2026-05",
    }

    try:
        pipeline_src = (ROOT / "model" / "pipeline.py").read_text()
        import re

        def _extract(pattern: str, src: str, cast=float):
            m = re.search(pattern, src)
            return cast(m.group(1)) if m else None

        kv = {
            "referral_rate": _extract(r"REFERRAL_RATE\s*=\s*([0-9.]+)", pipeline_src),
            "acceptance_rate": _extract(r"ACCEPTANCE_RATE\s*=\s*([0-9.]+)", pipeline_src),
            "compulsory_weight": _extract(r"COMPULSORY_WEIGHT\s*=\s*([0-9.]+)", pipeline_src),
            "arrcc_base": _extract(r'"base":\s*([0-9_]+)', pipeline_src, cast=lambda x: int(x.replace("_", ""))),
            "arrcc_pessimistic": _extract(r'"bear":\s*([0-9_]+)', pipeline_src, cast=lambda x: int(x.replace("_", ""))),
            "arrcc_optimistic": _extract(r'"bull":\s*([0-9_]+)', pipeline_src, cast=lambda x: int(x.replace("_", ""))),
        }
        for k, v in kv.items():
            if v is not None:
                defaults[k] = v
    except Exception:
        pass

    return defaults


# ── FILE 6 — mano_kpis.json (seed: MANO RNS FY19-FY26) ───────────────────────

def build_mano_kpis() -> dict:
    return {
        "fy_series": [
            {"fy": "FY19", "realised_m": 7.15, "completions": 35, "arrcc_k": 204, "roi_pct": None},
            {"fy": "FY20", "realised_m": 7.80, "completions": 54, "arrcc_k": 144, "roi_pct": None},
            {"fy": "FY21", "realised_m": 24.4, "completions": 135, "arrcc_k": 181, "roi_pct": None},
            {"fy": "FY22", "realised_m": 15.2, "completions": 139, "arrcc_k": 110, "roi_pct": None},
            {"fy": "FY23", "realised_m": 26.8, "completions": 193, "arrcc_k": 139, "roi_pct": None},
            {"fy": "FY24", "realised_m": 24.2, "completions": 251, "arrcc_k": 96, "roi_pct": 116},
            {"fy": "FY25", "realised_m": 29.5, "completions": 291, "arrcc_k": 110, "roi_pct": 130},
            {"fy": "FY26", "realised_m": 28.0, "completions": 291, "arrcc_k": 96, "roi_pct": None},
        ],
        "source": "MANO RNS · research_02",
    }


# ── FILE 7 — valuation.json (seed) ───────────────────────────────────────────

def build_valuation() -> dict:
    return {
        "price_gbx": 39.3,
        "singer_target_gbx": 130,
        "shares_m": 43.9,
        "case_nav_m": 41.8,
        "nav_per_share_gbx": 95,
        "forward_book_m": 67,
        "large_cases_m": 32,
        "large_cases_pct": 48,
        "active_investments": 282,
        "pb_ratio": 0.4,
        "source": "yfinance · Singer Capital Markets · MANO H1 FY26",
    }


# ── FILE 8 — balance_sheet.json (seed) ───────────────────────────────────────

def build_balance_sheet() -> dict:
    return {
        "net_debt_m": 11.5,
        "net_debt_ebitda": 3.7,
        "cash_deployment_pct": 73,
        "rcf_facility_m": 17.5,
        "rcf_drawn_m": 11.5,
        "rcf_headroom_m": 6.0,
        "debtor_delay_exposure_m": 4.7,
        "potential_provision_low_m": 1.5,
        "potential_provision_high_m": 2.0,
        "source": "MANO FY26 trading update · apríl 2026",
    }


# ── FILE 9 — peers.json (seed) ───────────────────────────────────────────────

def build_peers() -> dict:
    return {
        "peers": [
            {"name": "MANO", "market_cap": "£17m", "pb": 0.4, "roi_pct": 131, "is_mano": True},
            {"name": "BURFORD", "market_cap": "$3.1bn", "pb": 1.2, "roi_pct": 82, "is_mano": False},
            {"name": "LCM", "market_cap": "£89m", "pb": 0.7, "roi_pct": 78, "is_mano": False},
            {"name": "OMNI", "market_cap": "£42m", "pb": 0.5, "roi_pct": 64, "is_mano": False},
        ],
        "source": "výročné správy litigation funderov · jún 2026",
    }


# ── FILE 10 — pipeline_overview.json (single source of truth) ────────────────
# NOTE: this is just get_overview() + a source tag. ALL model numbers on the
# Overview page come from here; the funnel, hero and verdict read these fields.


# ── FILE 11 — mano_price_history.json ────────────────────────────────────────

# RNS announcement dates — seed (exact dates not derivable from price data).
_RNS_EVENTS = [
    {"date": "2021-06-30", "label": "FY21 RESULTS"},
    {"date": "2022-09-15", "label": "PROFIT WARNING"},
    {"date": "2023-06-30", "label": "FY23 RESULTS"},
    {"date": "2024-09-03", "label": "FY24 RESULTS"},
    {"date": "2025-06-30", "label": "FY25 RESULTS"},
    {"date": "2026-04-24", "label": "FY26 TRADING UPDATE"},
]


def build_price_history(con: sqlite3.Connection) -> dict:
    tbls = _tables(con)
    series: list[dict] = []
    if "mano_price" in tbls:
        try:
            df = pd.read_sql(
                "SELECT date, close FROM mano_price ORDER BY date ASC",
                con,
                parse_dates=["date"],
            )
            df = df.dropna(subset=["date", "close"])
            # weekly downsample (last close per ISO week) — 1889 daily → ~390 pts
            df = df.set_index("date").resample("W").last().dropna(subset=["close"])
            for dt, row in df.iterrows():
                series.append(
                    {"date": dt.strftime("%Y-%m-%d"), "close": round(float(row["close"]), 1)}
                )
        except Exception:
            series = []
    return {
        "series": series,
        "rns_events": _RNS_EVENTS,
        "source": "yfinance · MANO RNS announcements",
    }


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # tracker.db is gitignored and is NOT present in CI (CLAUDE.md). The
    # committed frontend/public/data/*.json files are the real shipping
    # artifact. If the DB is missing we keep those committed files untouched
    # rather than crash the Pages build — running this locally (where the DB
    # exists) is what refreshes them.
    if not DB_PATH.exists():
        print(f"  tracker.db not found at {DB_PATH} — keeping committed JSON.")
        print("  (run locally with the DB present to regenerate data files)")
        return

    # Compute the model overview FIRST — it is the single source of truth and
    # also supplies the authoritative trailing-12m insolvency figure to kpis.
    overview = get_overview(DB_PATH)
    overview_out = {**overview, "source": "model/pipeline.py"}

    con = sqlite3.connect(DB_PATH)
    try:
        kpis = build_kpis(con, insolvencies_12m_override=overview["insolvencies_12m"])
        assumptions = build_pipeline_assumptions()
        files = {
            "kpis.json": kpis,
            "insolvency_timeseries.json": build_timeseries(con),
            "ip_network.json": build_ip_network(con),
            "gazette_recent.json": build_gazette_recent(con),
            "pipeline_assumptions.json": assumptions,
            "mano_kpis.json": build_mano_kpis(),
            "valuation.json": build_valuation(),
            "balance_sheet.json": build_balance_sheet(),
            "peers.json": build_peers(),
            "pipeline_overview.json": overview_out,
            "mano_price_history.json": build_price_history(con),
        }
    finally:
        con.close()

    for name, data in files.items():
        path = OUT_DIR / name
        path.write_text(json.dumps(data, **COMPACT), encoding="utf-8")
        print(f"  wrote {name} ({path.stat().st_size:,} bytes)")

    # Print the chain so it can be confirmed by hand (HARD CONSTRAINT 1).
    print_overview_chain(overview)
    print("\nDone.")


if __name__ == "__main__":
    main()
