/* Display-level entity classification for the IP market-structure map.
 *
 * The source ip_network.json is NOT rewritten — this only tags entities at
 * render time so the map stops conflating government offices with named people.
 *
 * The Gazette names the appointed insolvency practitioner, so the entities are
 * overwhelmingly INDIVIDUALS (people: Jamie Playford, Andrew Ryder, …). The
 * exception is the Official Receiver's office, which appears as one node per
 * regional branch ("The Official Receiver Or Nottingham/London/Manchester/…").
 * Empirically the top-140 rendered set is 12 OR branches + 128 individuals and
 * 0 firms, so we distinguish exactly two honest kinds:
 *
 *   - "or"         — an Official Receiver branch (a government office, not a
 *                    boutique IP). We KEEP branches separate (each sits in its
 *                    own region, which is real geographic signal) but tag them
 *                    so they read as OR offices, not as one person.
 *   - "individual" — a named insolvency practitioner (a person).
 *
 * No entities are invented, dropped, or merged away. */

export type IpKind = "or" | "individual";

const OR_RE = /official receiver/i;

export function classifyIp(fullName: string): IpKind {
  return OR_RE.test(fullName) ? "or" : "individual";
}

/** For OR branches, the branch city ("Nottingham" from "...Or Nottingham"),
 *  used as a short readable label. Empty for individuals. */
export function orBranch(fullName: string): string {
  const m = fullName.match(/official receiver\s+or\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export const IP_KIND_LABEL: Record<IpKind, string> = {
  or: "úrad (Official Receiver)",
  individual: "jednotlivec (IP)",
};
