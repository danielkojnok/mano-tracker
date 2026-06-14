import { useFetch } from "../../hooks/useData";
import type { SicSectors } from "../../types/data";
import { sicName } from "../../lib/sicNames";
import "./SicTable.css";

/* Sektory SIC — one row per sector, sorted by 12M count desc:
 *   LEFT  sub-column = lollipop (thin stem + dot) of the trailing-12m count;
 *   RIGHT sub-column = diverging YoY around a zero axis
 *                      (red left = pokles, green right = rast).
 *
 * HONESTY:
 *  - counts are real (sic_sectors.json ← Insolvency Service record-level);
 *  - HARD CAP top-25 NAMED sectors; the rest (the long tail + any code without a
 *    readable Slovak name) roll into one "Ostatné (n)" row, value = their summed
 *    12M; YoY omitted for Ostatné (mixed);
 *  - a SIC code with no readable Slovak name (placeholder codes like UNK, rare
 *    divisions) is NEVER shown as a bare code — it folds into Ostatné. */

const CAP = 25;

interface Row {
  code: string;
  name: string;
  n12m: number;
  yoy: number | null;
}

export default function SicTable() {
  const { data, loading, error } = useFetch<SicSectors>("sic_sectors.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 440 }} />;
  if (error || !data || data.sectors.length === 0)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  // Resolve Slovak names; only NAMED sectors are display candidates (sectors
  // arrive already sorted by n12m desc from the export).
  const named: Row[] = data.sectors.flatMap((s) => {
    const name = sicName(s.code);
    return name ? [{ code: s.code, name, n12m: s.n12m, yoy: s.yoy }] : [];
  });

  const shown = named.slice(0, CAP);
  const shownCodes = new Set(shown.map((r) => r.code));
  const remaining = data.sectors.filter((s) => !shownCodes.has(s.code));
  const ostatneCount = remaining.length;
  const ostatneValue = remaining.reduce((a, s) => a + s.n12m, 0);

  // lollipop scaled to the largest NAMED sector (Ostatné is an aggregate, not a
  // single comparable sector, so it is shown as a value only — no dot/scale).
  const maxN = shown[0]?.n12m ?? 1;
  // symmetric diverging axis, rounded up to a clean ±step
  const maxYoY = Math.max(
    5,
    Math.ceil(Math.max(...shown.map((r) => Math.abs(r.yoy ?? 0))) / 5) * 5,
  );

  const [nowFrom, nowTo] = data.window_now;

  return (
    <div className="sic2">
      <div className="sic2-head mono">
        <span className="sic2-h-label">SEKTOR</span>
        <span className="sic2-h-lolli">12M POČET</span>
        <span className="sic2-h-yoy">YoY (±{maxYoY}%)</span>
      </div>

      <div className="sic2-body">
        {shown.map((r) => {
          const nPct = (r.n12m / maxN) * 100;
          const yoy = r.yoy ?? 0;
          const yPct = (Math.abs(yoy) / maxYoY) * 50;
          const up = yoy >= 0;
          return (
            <div className="sic2-row" key={r.code}>
              <span className="sic2-label" title={`SIC ${r.code} · ${r.name}`}>
                <span className="sic2-name">{r.name}</span>
                <span className="sic2-code mono">SIC {r.code}</span>
              </span>

              {/* LEFT — lollipop */}
              <span className="sic2-lolli">
                <span className="sic2-track">
                  <span className="sic2-stem" style={{ width: `${nPct}%` }} />
                  <span className="sic2-dot" style={{ left: `${nPct}%` }} />
                </span>
                <span className="sic2-num mono">
                  {r.n12m.toLocaleString("en-GB")}
                </span>
              </span>

              {/* RIGHT — diverging YoY around zero */}
              <span className="sic2-yoy">
                <span className="sic2-div">
                  <span className="sic2-zero" />
                  {r.yoy !== null && yoy !== 0 && (
                    <span
                      className={`sic2-bar ${up ? "pos" : "neg"}`}
                      style={
                        up
                          ? { left: "50%", width: `${yPct}%` }
                          : { right: "50%", width: `${yPct}%` }
                      }
                    />
                  )}
                </span>
                <span className={`sic2-yval mono ${up ? "up" : "down"}`}>
                  {r.yoy === null ? "—" : `${up ? "▲" : "▼"}${Math.abs(yoy)}%`}
                </span>
              </span>
            </div>
          );
        })}

        {/* Ostatné — aggregate of the remaining sectors. Value only (not a
            single sector → no lollipop scale), YoY omitted (mixed). */}
        <div className="sic2-row sic2-row-rest">
          <span className="sic2-label">
            <span className="sic2-name">Ostatné</span>
            <span className="sic2-code mono">{ostatneCount} sektorov</span>
          </span>
          <span className="sic2-lolli">
            <span className="sic2-track sic2-track-rest" />
            <span className="sic2-num mono">
              {ostatneValue.toLocaleString("en-GB")}
            </span>
          </span>
          <span className="sic2-yoy">
            <span className="sic2-div" />
            <span className="sic2-yval mono sic2-yval-na">—</span>
          </span>
        </div>
      </div>

      <div className="chart-footnote">
        Lollipop = počet insolvencií za 12M (do {nowTo}); diverging =
        medziročná zmena (<b className="down">červená vľavo</b> = pokles,{" "}
        <b className="up">zelená vpravo</b> = rast), os ±{maxYoY} %. Top {CAP}{" "}
        pomenovaných sektorov; zvyšných {ostatneCount} (dlhý chvost + kódy bez
        čitateľného slovenského názvu, napr. UNK) je zlúčených do{" "}
        <b>Ostatné</b> (Σ {ostatneValue.toLocaleString("en-GB")}), YoY pri zmesi
        neuvádzame. Okno {nowFrom}–{nowTo}. Zdroj: {data.source}.
      </div>
    </div>
  );
}
