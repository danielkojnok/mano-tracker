import {
  SUPPORT_FACTORS,
  RISK_FACTORS,
  SUPPORT_SUM,
  RISK_SUM,
  NET_SCORE,
  verdict,
  type ScoreFactor,
} from "../../data/thesisScoring";
import { useFetch } from "../../hooks/useData";
import type { Valuation } from "../../types/data";
import "./VerdictBlock.css";

/* Verdikt tézy — three-zone weighted scorecard (R1.1 issue 4).
 * Verdict + score computed from data/thesisScoring.ts. */

const ellipsis = (s: string, n = 28) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const signed = (n: number) => (n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

function FactorRow({ f }: { f: ScoreFactor }) {
  const isSupport = f.score >= 0;
  return (
    <div className="verdict-factor">
      <span className={`verdict-marker mono ${isSupport ? "gold-dim" : "down"}`}>
        {f.marker}
      </span>
      <span className="verdict-flabel" title={f.label}>
        {ellipsis(f.label)}
      </span>
      <span className="verdict-evidence mono">{f.evidence}</span>
      <span className={`verdict-score mono ${isSupport ? "up" : "down"}`}>
        ({signed(f.score)})
      </span>
    </div>
  );
}

export default function VerdictBlock() {
  const { data: val } = useFetch<Valuation>("valuation.json");
  const v = verdict(NET_SCORE);
  const singerUpside = val
    ? Math.round(((val.singer_target_gbx - val.price_gbx) / val.price_gbx) * 100)
    : 231;

  return (
    <div className="verdict-block">
      {/* ZONE 1 — verdict header */}
      <div className="verdict-header">
        <div className="verdict-headline">{v}</div>
        <div className="verdict-score-box mono">
          <div className="verdict-score-num">
            {signed(NET_SCORE)} / 10
          </div>
          <div className="verdict-score-cap">vážené skóre · max ±10</div>
        </div>
      </div>

      {/* ZONE 2 — weighted scorecard */}
      <div className="verdict-cols">
        <div className="verdict-col">
          <h3 className="verdict-col-head up">PODPORUJE</h3>
          {SUPPORT_FACTORS.map((f) => (
            <FactorRow key={f.label} f={f} />
          ))}
          <div className="verdict-sum mono">
            PODPORA SUM: <span className="up">{signed(SUPPORT_SUM)}</span>
          </div>
        </div>
        <div className="verdict-col verdict-col-right">
          <h3 className="verdict-col-head down">OHROZUJE</h3>
          {RISK_FACTORS.map((f) => (
            <FactorRow key={f.label} f={f} />
          ))}
          <div className="verdict-sum mono">
            RIZIKO SUM: <span className="down">{signed(RISK_SUM)}</span>
          </div>
        </div>
      </div>

      {/* ZONE 3 — verdict summary strip */}
      <div className="verdict-summary">
        ZÁVER · pipeline drží (<span className="gold">{signed(SUPPORT_SUM)}</span>)
        · riziko exekúcie a súvahy (<span className="gold">{signed(RISK_SUM)}</span>)
        · čistá pozícia <span className="gold">{signed(NET_SCORE)} / 10</span> ·
        oceňovacia medzera <span className="gold">+{singerUpside}%</span> k Singer
      </div>
    </div>
  );
}
