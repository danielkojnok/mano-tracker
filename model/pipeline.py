"""
model/pipeline.py
Funnel model: monthly CVL + compulsory liquidations → projected MANO revenue.

Pipeline logic:
  CVL + compulsory liquidations  →  MANO enquiries (referrals)
  →  accepted investments  →  completions (lagged)  →  cash (lagged)  →  revenue

Key assumptions (all changeable at top of file):
  referral_rate    = 4.25%   of CVL+compulsory reach MANO as enquiry
  acceptance_rate  = 30.0%   of enquiries become investments
  case_lag_months  = 13      months investment → completion
  cash_lag_months  = 12      months completion → cash
  rev_per_case     = scenario range (bear/base/bull), default "base"

── v0.2 changes (driven by research_01 / research_02 / research_03) ──────────
1. COMPULSORY vs CVL split: compulsory liquidations (court-ordered, often HMRC
   petitions) carry higher-value claims than CVL → separate weighting.
2. REVENUE PER CASE: single £108k point estimate replaced by a bear/base/bull
   scenario range; revenue models *realised* (cash-collected) revenue only.
3. LAG STRUCTURE: median lag kept as the central case, but a ±6-month
   confidence band (low/high) is now produced so the dashboard can show a
   projection range rather than a single false-precision line.
4. CAPACITY CAP: MANO underwriting team has a practical ceiling
   (~282 investments/yr historically). Implied investments above the cap are
   scaled down so the model does not extrapolate impossible growth.
"""

import sqlite3
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "tracker.db"

# ── tuneable knobs ─────────────────────────────────────────────────────────
REFERRAL_RATE   = 0.0425   # fraction of CVL+compulsory that become MANO enquiries
ACCEPTANCE_RATE = 0.30     # fraction of enquiries accepted as investments

# --- compulsory vs CVL weighting (research_01 / research_03) ----------------
# Compulsory liquidations are court-ordered (often HMRC petitions). They tend
# to carry more real, recoverable claims than "empty box" CVLs, so each
# compulsory case is worth more to MANO than a CVL. We express this as a
# weight applied to the compulsory count BEFORE the referral rate is applied.
# 1.0 = treat them the same as CVL (old behaviour); 1.3 = 30% more valuable.
COMPULSORY_WEIGHT = 1.30

# --- lag structure (research_01) -------------------------------------------
# The median lag is the central estimate. Real case durations are bimodal
# (fast empty shells vs slow complex claims), so we also produce a low/high
# band of ±LAG_UNCERTAINTY months around the central lag.
CASE_LAG_MONTHS  = 13       # investment → completion (central)
CASH_LAG_MONTHS  = 12       # completion → cash (central)
LAG_UNCERTAINTY  = 6        # ± months applied to the TOTAL lag for the band

# --- revenue per case scenarios (research_02) ------------------------------
# ARRCC = Average Realised Revenue per Completed Case. The old model used a
# single £108k figure; research shows this should be a range. FY25 audited
# (ex-Bounce-Back-Loan) was ~£110k; H1 FY26 dipped to ~£64k (quiet period);
# a return to a larger-case mix could push it toward FY21 levels (~£180k).
REV_PER_CASE_SCENARIOS = {
    "bear": 95_000,    # CVL/SME dominates, few large settlements
    "base": 110_000,   # FY25 audited ex-BBL baseline
    "bull": 150_000,   # return of large administrations to the case mix
}
DEFAULT_SCENARIO = "base"

# --- capacity cap (research_01 / research_03) ------------------------------
# MANO's underwriting team can only sign so many new investments per year.
# Historical practical max ≈ 282/yr (FY25). Above this monthly-equivalent
# ceiling, implied investments are scaled down rather than taken at face value.
ANNUAL_INVESTMENT_CAP = 350           # allow some headroom above FY25's 282
MONTHLY_INVESTMENT_CAP = ANNUAL_INVESTMENT_CAP / 12


def load_insolvencies(db_path: Path = DB_PATH) -> pd.DataFrame:
    conn = sqlite3.connect(db_path)
    df = pd.read_sql(
        "SELECT date, cvl, compulsory, total FROM insolvencies_monthly ORDER BY date",
        conn,
        parse_dates=["date"],
    )
    conn.close()

    cvl = df["cvl"].fillna(0)
    comp = df["compulsory"].fillna(0)

    # Raw addressable market (unweighted) — kept for reference / charts.
    df["mano_market"] = cvl + comp
    # Weighted market: compulsory cases count for more (higher claim value).
    df["mano_market_weighted"] = cvl + comp * COMPULSORY_WEIGHT
    return df


def build_pipeline(
    df: pd.DataFrame,
    scenario: str = DEFAULT_SCENARIO,
    *,
    referral_rate: float | None = None,
    acceptance_rate: float | None = None,
    compulsory_weight: float | None = None,
    apply_capacity_cap: bool = True,
    monthly_cap: float | None = None,
) -> pd.DataFrame:
    """
    Takes monthly insolvency data and returns a DataFrame with:
      - implied_referrals    : monthly MANO enquiries (from weighted market)
      - implied_investments  : monthly accepted cases (capacity-capped)
      - implied_cash_month   : monthly cases reaching cash (central lag)
      - implied_revenue_gbp  : central revenue projection (£)
      - implied_revenue_low  : revenue with the LONGER lag (slower scenario)
      - implied_revenue_high : revenue with the SHORTER lag (faster scenario)
      - fy                   : MANO financial year (Apr–Mar)

    `scenario` selects the revenue-per-case figure: "bear" | "base" | "bull".

    The keyword-only overrides (referral_rate, acceptance_rate,
    compulsory_weight, apply_capacity_cap, monthly_cap) all default to the
    module-level constants so existing callers are unaffected. They let an
    interactive caller (e.g. the dashboard scenario explorer) recompute the
    projection with different assumptions without mutating module state.
    """
    if scenario not in REV_PER_CASE_SCENARIOS:
        raise ValueError(
            f"scenario must be one of {list(REV_PER_CASE_SCENARIOS)}, got {scenario!r}"
        )
    rev_per_case = REV_PER_CASE_SCENARIOS[scenario]

    # Resolve overridable assumptions, falling back to module constants.
    referral     = REFERRAL_RATE      if referral_rate     is None else referral_rate
    acceptance   = ACCEPTANCE_RATE    if acceptance_rate   is None else acceptance_rate
    comp_weight  = COMPULSORY_WEIGHT  if compulsory_weight is None else compulsory_weight
    cap          = MONTHLY_INVESTMENT_CAP if monthly_cap   is None else monthly_cap

    out = df[
        ["date", "cvl", "compulsory", "mano_market", "mano_market_weighted"]
    ].copy()

    # Re-derive the weighted market if the caller overrode the weight, so the
    # slider on the dashboard actually moves the funnel.
    if compulsory_weight is not None:
        out["mano_market_weighted"] = (
            out["cvl"].fillna(0) + out["compulsory"].fillna(0) * comp_weight
        )

    # Funnel: weighted market → referrals → investments.
    out["implied_referrals"]   = (out["mano_market_weighted"] * referral).round(1)
    out["implied_investments"] = (out["implied_referrals"] * acceptance).round(1)

    # Capacity cap: MANO can't sign more than ~cap investments/month.
    if apply_capacity_cap:
        out["implied_investments_capped"] = out["implied_investments"].clip(upper=cap)
    else:
        out["implied_investments_capped"] = out["implied_investments"]

    # Lag structure. Central case = case lag + cash lag. The low/high band
    # widens the *total* lag by ±LAG_UNCERTAINTY months. A longer lag means
    # cash arrives later (the "low/slow" projection); a shorter lag means it
    # arrives sooner (the "high/fast" projection).
    total_lag      = CASE_LAG_MONTHS + CASH_LAG_MONTHS
    total_lag_slow = total_lag + LAG_UNCERTAINTY
    total_lag_fast = max(total_lag - LAG_UNCERTAINTY, 1)

    out["implied_completions"] = out["implied_investments_capped"].shift(CASE_LAG_MONTHS)

    cash_central = out["implied_investments_capped"].shift(total_lag)
    cash_slow    = out["implied_investments_capped"].shift(total_lag_slow)
    cash_fast    = out["implied_investments_capped"].shift(total_lag_fast)

    out["implied_cash_month"]   = cash_central
    out["implied_revenue_gbp"]  = (cash_central * rev_per_case).round(0)
    out["implied_revenue_low"]  = (cash_slow    * rev_per_case).round(0)
    out["implied_revenue_high"] = (cash_fast    * rev_per_case).round(0)

    out["scenario"]     = scenario
    out["rev_per_case"] = rev_per_case

    # MANO financial year: April → March.
    out["fy"] = out["date"].apply(lambda d: d.year + 1 if d.month >= 4 else d.year)
    return out


def projected_fy_revenue(df_pipeline: pd.DataFrame) -> pd.DataFrame:
    """Aggregate monthly cash to FY-level projected revenue (central + band)."""
    fy_df = (
        df_pipeline.groupby("fy")[
            ["implied_revenue_gbp", "implied_revenue_low", "implied_revenue_high"]
        ]
        .sum()
        .reset_index()
        .rename(columns={
            "implied_revenue_gbp":  "projected_revenue_gbp",
            "implied_revenue_low":  "projected_revenue_low",
            "implied_revenue_high": "projected_revenue_high",
        })
    )
    return fy_df


def run(scenario: str = DEFAULT_SCENARIO) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Full model run. Returns (monthly_pipeline, fy_projection)."""
    raw = load_insolvencies()
    pipeline = build_pipeline(raw, scenario=scenario)
    fy_proj  = projected_fy_revenue(pipeline)
    return pipeline, fy_proj


if __name__ == "__main__":
    pipeline, fy_proj = run()
    print(f"\n── Scenario: {DEFAULT_SCENARIO} "
          f"(£{REV_PER_CASE_SCENARIOS[DEFAULT_SCENARIO]:,}/case) ──")
    print("\n── Monthly pipeline (last 12 months) ──")
    print(pipeline.tail(12)[
        ["date", "mano_market", "mano_market_weighted", "implied_referrals",
         "implied_investments_capped", "implied_cash_month", "implied_revenue_gbp"]
    ].to_string(index=False))
    print("\n── Projected FY Revenue (central + low/high lag band) ──")
    print(fy_proj.tail(5).to_string(index=False))
