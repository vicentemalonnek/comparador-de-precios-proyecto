// Decides when two listings from different stores are the same product.
// It is deliberately conservative: a wrong merge is worse than a missed one.

const RAM_BRANDS = [
  "kingston", "corsair", "adata", "crucial", "lexar", "gskill",
  "teamgroup", "patriot", "hyperx", "netac", "pny", "samsung",
];
const SSD_BRANDS = [
  "kingston", "crucial", "wd", "adata", "lexar", "corsair",
  "msi", "kingspec", "samsung", "sandisk", "macrovip",
];
const RAM_LINES = [
  "lpx", "fury beast", "fury renegade", "fury impact", "rgb", "lancer",
  "vengeance",
];
const SSD_LINES = [
  "a400", "bx500", "nv3", "nv2", "kc600", "sn850x", "sn770", "sn580",
  "sn5100", "sn3000", "sn350", "sa510", "e100", "t500", "p3", "mp600",
  "legend 710", "legend 740", "nq100", "nq780", "s270", "dc600m",
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/western digital/g, "wd")
    .replace(/xpg/g, "adata") // XPG is the gaming brand of ADATA
    .replace(/g\.?\s?skill/g, "gskill")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cpuKey(n: string): string | null {
  const s = n.replace(/(\d{4})\s*x\s*3d/g, "$1x3d"); // "9800x 3d" -> "9800x3d"

  let m = s.match(/ryzen\s*([3579])\s*(\d{4}[a-z0-9]*)/);
  if (m) return `ryzen${m[1]}-${m[2]}`;

  m = s.match(/\bi([3579])\s*(\d{4,5}[a-z]{0,2})\b/);
  if (m) return `i${m[1]}-${m[2]}`;

  m = s.match(/ultra\s*([579])\s*(\d{3}[a-z]{0,2})\b/);
  if (m) return `ultra${m[1]}-${m[2]}`;

  return null;
}

function ramKey(n: string): string | null {
  const brand = RAM_BRANDS.find((b) => new RegExp(`\\b${b}\\b`).test(n));
  const gen = n.match(/ddr\s?([345])/);
  const capacity = n.match(/\b(\d{1,3})\s?gb\b/);
  const speed = n.match(/\b(\d{4})\s?(?:mhz|mt s|mts)/);
  if (!brand || !gen || !capacity || !speed) return null;

  const form = /sodimm|notebook|laptop/.test(n) ? "sodimm" : "dimm";
  const kit = /\bkit\b|\b\d\s?x\s?\d{1,2}\s?gb\b/.test(n) ? "kit" : "single";
  const line = RAM_LINES.find((l) => n.includes(l)) ?? "std";

  return `${brand}|ddr${gen[1]}|${capacity[1]}gb|${speed[1]}|${form}|${kit}|${line}`;
}

function ssdKey(n: string): string | null {
  const brand = SSD_BRANDS.find((b) => new RegExp(`\\b${b}\\b`).test(n));
  // "480 gb", "1 tb" and decimals such as "1 5 tb" (normalized from "1.5 TB")
  const capacity = n.match(/\b(\d{3,4}|\d{1,2}(?:\s\d{1,2})?)\s?(gb|tb)\b/);
  const line = SSD_LINES.find((l) => new RegExp(`\\b${l}\\b`).test(n));
  if (!brand || !capacity || !line) return null;

  const size = capacity[1].replace(" ", ".") + capacity[2];
  const variant = /\b2230\b/.test(n) ? "-2230" : "";
  return `${brand}|${size}|${line}${variant}`;
}

export function matchKey(category: string, name: string): string | null {
  const n = normalize(name);
  if (category === "cpu") return cpuKey(n);
  if (category === "ram") return ramKey(n);
  if (category === "ssd") return ssdKey(n);
  return null;
}

// Groups listings of the same product. A group is only formed when at least
// two stores have it AND every store has exactly one candidate; otherwise the
// match is ambiguous and the listings stay separate.
export function groupOffers<
  T extends { name: string; category: string; store: string },
>(items: T[]): T[][] {
  const buckets = new Map<string, T[]>();
  const groups: T[][] = [];

  for (const item of items) {
    const key = matchKey(item.category, item.name);
    if (key === null) {
      groups.push([item]);
      continue;
    }
    const bucketKey = `${item.category}:${key}`;
    buckets.set(bucketKey, [...(buckets.get(bucketKey) ?? []), item]);
  }

  for (const bucket of buckets.values()) {
    const distinct = new Set(bucket.map((i) => i.store));
    const matched = distinct.size >= 2 && distinct.size === bucket.length;

    if (matched) groups.push(bucket);
    else for (const item of bucket) groups.push([item]);
  }

  return groups;
}