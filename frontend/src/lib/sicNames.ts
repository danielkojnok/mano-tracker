/* SIC 2-digit → readable Slovak sector name.
 *
 * Counts come from sic_sectors.json (real, from the Insolvency Service
 * record-level data). NAMES are presentation only: standard SIC 2007 division
 * descriptions translated to Slovak. This map extends dashboard_utils.py's
 * SIC2_LABELS to cover the sectors that reach the displayed top tier.
 *
 * A code NOT in this map has no readable Slovak name — the SicTable folds it
 * into "Ostatné" rather than ever rendering a bare code (e.g. placeholder codes
 * "UNK"/"NT" or rarely-seen divisions). */

export const SIC_NAMES: Record<string, string> = {
  "56": "Pohostinstvo",
  "43": "Špecializované stavebné práce",
  "47": "Maloobchod",
  "41": "Výstavba budov",
  "82": "Administratívne služby",
  "46": "Veľkoobchod",
  "96": "Ostatné osobné služby",
  "68": "Reality",
  "62": "IT služby",
  "70": "Riadenie firiem",
  "45": "Predaj a oprava vozidiel",
  "78": "Pracovné agentúry",
  "49": "Pozemná doprava",
  "74": "Ostatné odborné činnosti",
  "64": "Finančné služby",
  "86": "Zdravotníctvo",
  "71": "Architektúra a inžinierstvo",
  "81": "Správa a údržba budov",
  "93": "Šport a rekreácia",
  "73": "Reklama a prieskum trhu",
  "55": "Ubytovanie",
  "90": "Umelecká tvorba",
  "25": "Kovovýroba",
  "85": "Vzdelávanie",
  "10": "Potravinárstvo",
  // ── added for the expanded ~25-sector view (standard SIC 2007 divisions) ──
  "32": "Ostatná výroba",
  "59": "Film, video a hudba",
  "42": "Inžinierske stavby",
  "33": "Oprava a inštalácia strojov",
  "69": "Právne a účtovné služby",
};

/** Slovak name for a SIC code, or null if the code has no readable name. */
export function sicName(code: string): string | null {
  return SIC_NAMES[code] ?? null;
}
