"""
app.py — MANO Tracker
Multi-page analytical dashboard (v0.6).

Entry point: defines navigation. Pages live in pages/.
Run:  streamlit run app.py
"""

import streamlit as st

from dashboard_utils import inject_css

st.set_page_config(
    page_title="MANO Tracker",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded",
)

inject_css()

nav = st.navigation([
    st.Page("pages/1_prehlad.py",      title="Prehľad",            icon="🎯", default=True),
    st.Page("pages/2_trh.py",          title="Insolvenčný trh",    icon="📊"),
    st.Page("pages/3_model.py",        title="MANO Pipeline model", icon="🔮"),
    st.Page("pages/4_spolocnost.py",   title="MANO Spoločnosť",    icon="🏛️"),
    st.Page("pages/5_diagnostika.py",  title="Dáta & diagnostika", icon="🧪"),
])

with st.sidebar:
    st.markdown(
        "<div style='font-size:1.3rem;font-weight:700'>⚖️ MANO Tracker</div>"
        "<div style='color:#7c8aa3;font-size:.78rem;margin-bottom:.6rem'>"
        "Litigation funding · LON:MANO.L</div>",
        unsafe_allow_html=True,
    )
    st.markdown(
        "<span class='pill'>UK insolvenčný predstih ~24 mes.</span>",
        unsafe_allow_html=True,
    )

nav.run()
