import { useFetch } from "../../hooks/useData";
import type { Peers, Peer } from "../../types/data";
import { T } from "../../styles/tokens";
import "./PeerComparison.css";

/* Peer comparison (manual §18) — MANO / Burford / LCM / Omni. P/B and ROI as
 * in-cell bars (comparable ranges); MANO highlighted gold. Market cap spans
 * £17m → $3.1bn, so it is shown as a LABELLED value, never a bar (Burford
 * would dwarf everything). All from peers.json. */

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div className="peer-bar-track">
      <div className="peer-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function PeerComparison() {
  const { data, loading, error } = useFetch<Peers>("peers.json");

  if (loading) return <div className="chart-skeleton" style={{ height: 240 }} />;
  if (error || !data)
    return <div className="chart-error mono">CHYBA · DÁTA NEDOSTUPNÉ</div>;

  const peers = data.peers;
  const maxPb = Math.max(...peers.map((p) => p.pb));
  const maxRoi = Math.max(...peers.map((p) => p.roi_pct));

  const barColor = (p: Peer) => (p.is_mano ? T.gold : T.signal);

  return (
    <div>
      <table className="peer-table mono">
        <thead>
          <tr>
            <th>FUNDER</th>
            <th className="peer-mcap">MARKET CAP</th>
            <th className="peer-metric">P/B</th>
            <th className="peer-metric">REALISED ROI</th>
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.name} className={p.is_mano ? "peer-mano" : ""}>
              <td className="peer-name">{p.name}</td>
              <td className="peer-mcap num">{p.market_cap}</td>
              <td className="peer-metric">
                <div className="peer-cell">
                  <Bar value={p.pb} max={maxPb} color={barColor(p)} />
                  <span className="peer-val num">{p.pb.toFixed(1)}×</span>
                </div>
              </td>
              <td className="peer-metric">
                <div className="peer-cell">
                  <Bar value={p.roi_pct} max={maxRoi} color={barColor(p)} />
                  <span className="peer-val num">{p.roi_pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="peer-note mono">
        Market cap je <b>label</b>, nie bar — rozsah £17m → $3.1bn (Burford) by
        zdeformoval mierku. MANO (zlatá) má najvyšší realised ROI a najnižší P/B
        v skupine: lacné na účtovnej hodnote, dokázaný výnos.
      </div>
    </div>
  );
}
