"""
Page 5 — Dáta & diagnostika
Table freshness, data quality checks, raw data explorer with CSV download.
"""

import pandas as pd
import streamlit as st

from dashboard_utils import (
    COLORS, page_header, require_table,
    get_table_diagnostics, get_market, get_record_level, get_companies_house,
    get_gazette, get_judgments, get_kpis, get_price, get_insolvencies_monthly,
)

page_header("Dáta & diagnostika", "Čerstvosť tabuliek, kontroly kvality, prieskumník surových dát.")

# ── table freshness ─────────────────────────────────────────────────────────
st.markdown("### Čerstvosť a počty riadkov")
diag = get_table_diagnostics()
if not require_table(diag, "—", "insolvency_stats.py"):
    st.stop()

disp = diag.copy()
disp["latest"] = disp["latest"].astype(str)   # mixed int/str → Arrow-safe
disp = disp.rename(columns={"table": "Tabuľka", "rows": "Riadky", "latest": "Najnovší záznam"})
st.dataframe(disp.set_index("Tabuľka"), width="stretch")

empty = diag[diag["rows"] == 0]["table"].tolist()
if empty:
    st.warning("Prázdne tabuľky: " + ", ".join(empty) +
               " — spusti príslušné ingest skripty.")
else:
    st.success("Všetky tabuľky obsahujú dáta. ✓")

st.divider()

# ── data quality checks ─────────────────────────────────────────────────────
st.markdown("### Kontroly kvality dát")
checks = []

# 1. missing months in monthly series
mon = get_insolvencies_monthly()
if not mon.empty:
    mon_sorted = mon.sort_values("date")
    expected = pd.date_range(mon_sorted["date"].min(), mon_sorted["date"].max(), freq="MS")
    missing = sorted(set(expected) - set(pd.to_datetime(mon_sorted["date"])))
    checks.append({
        "Kontrola": "Chýbajúce mesiace (insolvencies_monthly)",
        "Výsledok": "✓ žiadne" if not missing else f"✗ {len(missing)} chýba",
        "Detail": "—" if not missing else ", ".join(d.strftime("%Y-%m") for d in missing[:6]),
    })

# 2. duplicate company records (record-level)
rl = get_record_level()
if not rl.empty:
    dupes = rl.duplicated(subset=["company_number", "case_type", "month_registered"]).sum()
    checks.append({
        "Kontrola": "Duplicitné záznamy (record_level PK)",
        "Výsledok": "✓ žiadne" if dupes == 0 else f"✗ {dupes}",
        "Detail": "PK: company_number+case_type+month",
    })
    # null company numbers
    nulls = rl["company_number"].isna().sum() + (rl["company_number"] == "").sum()
    checks.append({
        "Kontrola": "Prázdne company_number",
        "Výsledok": "✓ žiadne" if nulls == 0 else f"⚠ {nulls}",
        "Detail": f"z {len(rl):,} riadkov",
    })

# 3. gazette notice type coverage
gaz = get_gazette()
if not gaz.empty:
    unknown = (gaz["notice_type_label"] == "unknown").sum() if "notice_type_label" in gaz else 0
    checks.append({
        "Kontrola": "Gazette — neznáme typy oznámení",
        "Výsledok": "✓ žiadne" if unknown == 0 else f"⚠ {unknown}",
        "Detail": f"z {len(gaz)} oznámení",
    })

# 4. price continuity (gap > 7 days)
price = get_price()
if not price.empty:
    gaps = price["date"].sort_values().diff().dt.days
    big_gaps = (gaps > 7).sum()
    checks.append({
        "Kontrola": "Cenové medzery > 7 dní",
        "Výsledok": "✓ žiadne" if big_gaps == 0 else f"⚠ {big_gaps} medzier",
        "Detail": "víkendy/sviatky sú normálne",
    })

if checks:
    st.dataframe(pd.DataFrame(checks).set_index("Kontrola"), width="stretch")

st.divider()

# ── raw data explorer ───────────────────────────────────────────────────────
st.markdown("### Prieskumník surových dát")

LOADERS = {
    "insolvencies_monthly": get_insolvencies_monthly,
    "insolvencies_record_level": get_record_level,
    "companies_house_profiles": get_companies_house,
    "gazette_notices": get_gazette,
    "judgments": get_judgments,
    "mano_kpis": get_kpis,
    "mano_price": get_price,
}
choice = st.selectbox("Vyber tabuľku", list(LOADERS.keys()))
df = LOADERS[choice]()

if df.empty:
    st.info(f"Tabuľka `{choice}` je prázdna.")
else:
    # optional text filter across string columns
    q = st.text_input("Filter (hľadá vo všetkých textových stĺpcoch)", "")
    view = df
    if q:
        mask = pd.Series(False, index=df.index)
        for col in df.select_dtypes(include="object").columns:
            mask |= df[col].astype(str).str.contains(q, case=False, na=False)
        view = df[mask]

    st.caption(f"{len(view):,} z {len(df):,} riadkov")
    # Arrow-safe render: stringify object columns (mixed types break pyarrow)
    safe = view.head(1000).copy()
    for col in safe.select_dtypes(include="object").columns:
        safe[col] = safe[col].astype(str)
    st.dataframe(safe, width="stretch", hide_index=True)

    st.download_button(
        "⬇ Stiahnuť CSV",
        data=view.to_csv(index=False).encode("utf-8"),
        file_name=f"{choice}.csv",
        mime="text/csv",
    )
