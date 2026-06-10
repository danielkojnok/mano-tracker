"""
model/pipeline.py
Funnel model: monthly CVL + compulsory liquidations → projected MANO revenue.

Key assumptions (all changeable at top of file):
  referral_rate    = 4.25%   of CVL+compulsory reach MANO as enquiry
  acceptance_rate  = 30.0%   of enquiries become investments
  case_lag_months  = 13      months investment → completion
  cash_lag_months  = 12      months completion → cash
  rev_per_case_gbp = 108_000 revenue per completed case (FY25 baseline)
"""

import sqlite3
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

# ── tuneable knobs ─────────────────────────────────────────────────────────
REFERRAL_RATE    = 0.0425   # fraction of CVL+compulsory that become MANO enquiries
ACCEPTANCE_RATE  = 0.30     # fraction of enquiries accepted as investments
CASE_LAG_MONTHS  = 13       # investment → completion
CASH_LAG_MONTHS  = 12       # completion → cash
REV_PER_CASE_GBP = 108_000  # £ revenue per completed case


def load_insolvencies(db_path: Path = DB_PATH) -> pd.DataFrame:
    conn = sqlite3.connect(db_path)
    df = pd.read_sql(
        "SELECT date, cvl, compulsory, total FROM insolvencies_monthly ORDER BY date",
        conn,
        parse_dates=["date"],
    )
    conn.close()
    df["mano_market"] = df["cvl"].fillna(0) + df["compulsory"].fillna(0)
    return df


def build_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes monthly insolvency data and returns a DataFrame with:
      - implied_referrals   : monthly MANO enquiries
      - implied_investments : monthly accepted cases
      - implied_completions : monthly completions (shifted by case_lag)
      - implied_cash_month  : monthly cash collected (shifted by case+cash lag)
      - implied_revenue_fy  : cumulative revenue per MANO financial year (Apr–Mar)
    """
    out = df[["date", "cvl", "compulsory", "mano_market"]].copy()

    out["implied_referrals"]   = (out["mano_market"] * REFERRAL_RATE).round(1)
    out["implied_investments"] = (out["implied_referrals"] * ACCEPTANCE_RATE).round(1)

    total_lag = CASE_LAG_MONTHS + CASH_LAG_MONTHS
    out["implied_completions"] = out["implied_investments"].shift(CASE_LAG_MONTHS)
    out["implied_cash_month"]  = out["implied_investments"].shift(total_lag)
    out["implied_revenue_gbp"] = (out["implied_cash_month"] * REV_PER_CASE_GBP).round(0)

    # MANO financial year: April → March
    out["fy"] = out["date"].apply(
        lambda d: d.year + 1 if d.month >= 4 else d.year
    )
    return out


def projected_fy_revenue(df_pipeline: pd.DataFrame) -> pd.DataFrame:
    """Aggregate monthly cash to FY-level projected revenue."""
    fy_df = (
        df_pipeline.groupby("fy")["implied_revenue_gbp"]
        .sum()
        .reset_index()
        .rename(columns={"implied_revenue_gbp": "projected_revenue_gbp"})
    )
    return fy_df


def run() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Full model run. Returns (monthly_pipeline, fy_projection)."""
    raw = load_insolvencies()
    pipeline = build_pipeline(raw)
    fy_proj  = projected_fy_revenue(pipeline)
    return pipeline, fy_proj


if __name__ == "__main__":
    pipeline, fy_proj = run()
    print("\n── Monthly pipeline (last 12 months) ──")
    print(pipeline.tail(12)[
        ["date", "mano_market", "implied_referrals",
         "implied_investments", "implied_cash_month", "implied_revenue_gbp"]
    ].to_string(index=False))
    print("\n── Projected FY Revenue ──")
    print(fy_proj.tail(5).to_string(index=False))
