/* UK postcode-AREA → broad region. Mirrors ingest/export_frontend_data.py's
 * _PC_AREA_REGION so the IP constellation clusters by the same regions the
 * regional treemap uses. Keyed by the postcode AREA (leading letters), e.g.
 * "M" → Severozápad, "NG" → East Midlands. */

const AREA_REGION: Record<string, string> = {
  E: "Londýn", EC: "Londýn", WC: "Londýn", N: "Londýn", NW: "Londýn",
  SE: "Londýn", SW: "Londýn", W: "Londýn",
  BN: "Juhovýchod", RH: "Juhovýchod", GU: "Juhovýchod", ME: "Juhovýchod",
  CT: "Juhovýchod", TN: "Juhovýchod", RG: "Juhovýchod", OX: "Juhovýchod",
  SL: "Juhovýchod", MK: "Juhovýchod", PO: "Juhovýchod", SO: "Juhovýchod",
  HP: "Juhovýchod", AL: "Juhovýchod",
  NR: "Východ", IP: "Východ", CB: "Východ", CO: "Východ", CM: "Východ",
  SS: "Východ", SG: "Východ", PE: "Východ", LU: "Východ", EN: "Východ",
  IG: "Východ", RM: "Východ",
  BS: "Juhozápad", BA: "Juhozápad", GL: "Juhozápad", EX: "Juhozápad",
  PL: "Juhozápad", TQ: "Juhozápad", TR: "Juhozápad", TA: "Juhozápad",
  DT: "Juhozápad", SN: "Juhozápad", SP: "Juhozápad", BH: "Juhozápad",
  B: "West Midlands", CV: "West Midlands", DY: "West Midlands",
  WV: "West Midlands", WS: "West Midlands", ST: "West Midlands",
  TF: "West Midlands", WR: "West Midlands", HR: "West Midlands",
  NG: "East Midlands", LE: "East Midlands", DE: "East Midlands",
  NN: "East Midlands", LN: "East Midlands",
  M: "Severozápad", PR: "Severozápad", L: "Severozápad", WA: "Severozápad",
  WN: "Severozápad", BL: "Severozápad", BB: "Severozápad", OL: "Severozápad",
  SK: "Severozápad", CW: "Severozápad", CH: "Severozápad", FY: "Severozápad",
  LA: "Severozápad", CA: "Severozápad",
  LS: "Yorkshire", S: "Yorkshire", BD: "Yorkshire", HD: "Yorkshire",
  HX: "Yorkshire", WF: "Yorkshire", HU: "Yorkshire", YO: "Yorkshire",
  DN: "Yorkshire", HG: "Yorkshire",
  NE: "Severovýchod", SR: "Severovýchod", DH: "Severovýchod",
  DL: "Severovýchod", TS: "Severovýchod",
  G: "Škótsko", EH: "Škótsko", AB: "Škótsko", DD: "Škótsko",
  FK: "Škótsko", KY: "Škótsko", PA: "Škótsko", ML: "Škótsko",
  IV: "Škótsko", PH: "Škótsko", KA: "Škótsko", DG: "Škótsko",
  CF: "Wales", SA: "Wales", NP: "Wales", LL: "Wales", LD: "Wales", SY: "Wales",
  BT: "Severné Írsko",
};

export function areaToRegion(area: string | null | undefined): string {
  if (!area) return "Ostatné";
  const a = area.trim().toUpperCase();
  if (AREA_REGION[a.slice(0, 2)]) return AREA_REGION[a.slice(0, 2)];
  if (AREA_REGION[a.slice(0, 1)]) return AREA_REGION[a.slice(0, 1)];
  return "Ostatné";
}

/* Ordered region palette (stable colours for legend + nodes). */
export const REGION_ORDER = [
  "Londýn", "Severozápad", "Yorkshire", "Východ", "West Midlands",
  "Juhovýchod", "East Midlands", "Juhozápad", "Severovýchod", "Škótsko",
  "Wales", "Severné Írsko", "Ostatné",
];
