import { findSimilarLookupValues, normalizeLookupValue } from './foodlog-core.js';

// Identity deliberately preserves punctuation and word boundaries. Fuzzy matches
// suggest choices; they never establish identity or merge distinct entries.
export function lookupKey(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

export const CUISINE_CHOICES = [
  'American', 'Chinese', 'Egyptian', 'French', 'Greek', 'Indian', 'International',
  'Italian', 'Japanese', 'Korean', 'Lebanese', 'Mediterranean', 'Mexican',
  'Middle Eastern', 'Seafood', 'Spanish', 'Thai', 'Turkish', 'Vietnamese', 'Yemeni'
];

// Preserve current display names. Never merge another existing entry into these
// groups: aliases that collide with a real entry are withheld for manual review.
export const LOOKUP_ALIAS_GROUPS = [
  { kind: 'location', name: 'New Cairo', context: 'Cairo', aliases: ['New cauro', 'tagamo3', 'tagamoo3', 'التجمع', 'القاهرة الجديدة'] },
  { kind: 'location', name: 'Maadi', context: 'Cairo', aliases: ['المعادي', 'معادي'] },
  { kind: 'location', name: 'Madenet Nasr', context: 'Cairo', aliases: ['Nasr City', 'Madinat Nasr', 'Madinet Nasr', 'مدينة نصر'] },
  { kind: 'location', name: 'Zamalek', context: 'Cairo', aliases: ['الزمالك', 'زمالك'] },
  { kind: 'location', name: 'Alexandria', context: '', aliases: ['الإسكندرية', 'الاسكندرية'] },
  { kind: 'location', name: 'Sheikh Zayed', context: 'Giza', aliases: ['الشيخ زايد'] },
  { kind: 'cuisine', name: 'Chinese', aliases: ['صيني'] },
  { kind: 'cuisine', name: 'Italian', aliases: ['إيطالي', 'ايطالي'] },
  { kind: 'cuisine', name: 'Japanese', aliases: ['ياباني'] },
  { kind: 'cuisine', name: 'Korean', aliases: ['كوري'] },
  { kind: 'cuisine', name: 'Egyptian', aliases: ['مصري'] }
];

export function buildLookupCatalog(kind, values = [], remote = []) {
  const entries = new Map();
  const keys = new Map();
  for (const row of remote.filter(row => row.kind === kind)) {
    if (!row.id || !lookupKey(row.name)) continue;
    const entry = { ...row, aliases: [...(row.aliases ?? [])] };
    entries.set(row.id, entry);
    keys.set(lookupKey(row.name), entry);
    entry.aliases.forEach(alias => keys.set(lookupKey(alias), entry));
  }
  const clean = name => String(name ?? '').trim().replace(/\s+/gu, ' ');
  const names = [...values].sort((a, b) => Number(a !== clean(a)) - Number(b !== clean(b)));
  if (kind === 'cuisine') names.push(...CUISINE_CHOICES);
  for (const raw of names) {
    let name = String(raw ?? '').trim().replace(/\s+/gu, ' ');
    // One explicitly approved equivalence, also available in offline fixtures.
    if (kind === 'location' && ['new cairo', 'new cauro', 'tagamo3', 'tagamoo3'].includes(lookupKey(name))) name = 'New Cairo';
    const key = lookupKey(name);
    if (!key) continue;
    const existing = keys.get(key);
    if (existing) {
      if (name !== existing.name && !existing.aliases.includes(name)) existing.aliases.push(name);
      continue;
    }
    const entry = { id: `local:${kind}:${key}`, kind, name, context: '', aliases: [] };
    entries.set(entry.id, entry);
    keys.set(key, entry);
  }
  for (const group of LOOKUP_ALIAS_GROUPS.filter(group => group.kind === kind)) {
    const entry = keys.get(lookupKey(group.name));
    if (!entry) continue;
    entry.context ||= group.context ?? '';
    for (const alias of group.aliases) {
      if (keys.has(lookupKey(alias)) && keys.get(lookupKey(alias)) !== entry) continue;
      if (!entry.aliases.includes(alias)) entry.aliases.push(alias);
      keys.set(lookupKey(alias), entry);
    }
  }
  return [...entries.values()];
}

export function exactLookupEntry(value, catalog = []) {
  const key = lookupKey(value);
  if (!key) return null;
  return catalog.find(entry => lookupKey(entry.name) === key || entry.aliases.some(alias => lookupKey(alias) === key)) ?? null;
}

export function searchLookupCatalog(value, catalog = []) {
  const query = normalizeLookupValue(value);
  const exact = exactLookupEntry(value, catalog);
  if (!query) return catalog.filter(entry => !entry.retired).map(entry => ({ ...entry, match: 'existing' }));
  const similar = findSimilarLookupValues(value, catalog.map(entry => entry.name));
  return catalog.filter(entry => !entry.retired).map((entry, order) => {
    const name = normalizeLookupValue(entry.name);
    const alias = entry.aliases.find(alias => normalizeLookupValue(alias).includes(query));
    const fuzzy = similar.find(match => match.value === entry.name);
    const rank = entry.id === exact?.id ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : alias ? 3 : fuzzy ? 4 : 5;
    return { ...entry, rank, order, similarity: fuzzy?.similarity ?? 0, match: rank === 4 ? 'similar' : alias && !name.includes(query) ? 'alias' : 'existing', matchedAlias: alias ?? '' };
  }).filter(entry => entry.rank < 5).sort((a, b) => a.rank - b.rank || (a.rank === 4 ? b.similarity - a.similarity : 0) || a.order - b.order);
}

export function canonicalLookupValue(value, catalog) {
  return exactLookupEntry(value, catalog)?.name ?? String(value ?? '').trim().replace(/\s+/gu, ' ');
}

export function sameLookupValue(first, second, catalog) {
  const a = exactLookupEntry(first, catalog);
  const b = exactLookupEntry(second, catalog);
  return a && b ? a.id === b.id : lookupKey(first) === lookupKey(second);
}

export function normalizeImportedLookups(restaurants, catalogs) {
  const changes = [];
  const result = restaurants.map((restaurant, index) => {
    const next = { ...restaurant };
    for (const kind of ['location', 'cuisine']) {
      const value = canonicalLookupValue(restaurant[kind], catalogs[kind]);
      if (value !== (restaurant[kind] ?? '')) changes.push({ index, kind, from: restaurant[kind] ?? '', to: value });
      next[kind] = value;
      // IDs from exports belong to their source registry, not necessarily ours.
      next[`${kind}Id`] = exactLookupEntry(value, catalogs[kind])?.id ?? null;
    }
    return next;
  });
  return { restaurants: result, changes };
}
