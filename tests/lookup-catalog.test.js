import { describe, expect, it } from 'vitest';
import { buildLookupCatalog, canonicalLookupValue, exactLookupEntry, lookupKey, normalizeImportedLookups, sameLookupValue, searchLookupCatalog } from '../lib/lookup-catalog.js';

describe('canonical lookup identity', () => {
  it('combines only the owner-approved New Cairo spellings and keeps retired entries out of suggestions', () => {
    const locations = buildLookupCatalog('location', ['New cauro', 'tagamo3', 'Maadi']);
    expect(locations.filter(entry => entry.name === 'New Cairo')).toHaveLength(1);
    expect(sameLookupValue('tagamoo3', 'New cauro', locations)).toBe(true);
    const cuisines = buildLookupCatalog('cuisine', ['Chinese'], [{ id: 'retired-chinese', kind: 'cuisine', name: 'Chinese', aliases: ['صيني'], retired: true }]);
    expect(cuisines.filter(entry => entry.name === 'Chinese')).toHaveLength(1);
    expect(exactLookupEntry('صيني', cuisines).id).toBe('retired-chinese');
    expect(searchLookupCatalog('', cuisines).some(entry => entry.name === 'Chinese')).toBe(false);
    expect(searchLookupCatalog('Chinese', cuisines)).toEqual([]);
  });
  it('normalizes case, Unicode compatibility and spacing without collapsing distinct boundaries', () => {
    expect(lookupKey(' ＭＡＡＤＩ  ')).toBe('maadi');
    expect(lookupKey('New   Cairo')).toBe('new cairo');
    expect(lookupKey('A-B')).not.toBe(lookupKey('AB'));
    expect(lookupKey('New Town')).not.toBe(lookupKey('Newtown'));
  });
  it('finds Arabic and English aliases while retaining the existing preferred label', () => {
    const catalog = buildLookupCatalog('location', ['Maadi', 'Madenet Nasr']);
    expect(canonicalLookupValue('مدينة نصر', catalog)).toBe('Madenet Nasr');
    expect(canonicalLookupValue('Nasr City', catalog)).toBe('Madenet Nasr');
    expect(searchLookupCatalog('Nasr City', catalog)[0]).toMatchObject({ name: 'Madenet Nasr', match: 'alias', context: 'Cairo' });
    expect(sameLookupValue(' MAADI ', 'المعادي', catalog)).toBe(true);
  });
  it('does not treat a fuzzy suggestion as an identity or merge another existing label', () => {
    const catalog = buildLookupCatalog('location', ['Maadi', 'Madenet Nasr', 'Nasr City']);
    expect(exactLookupEntry('Maddi', catalog)).toBeNull();
    expect(searchLookupCatalog('Maddi', catalog)[0]).toMatchObject({ name: 'Maadi', match: 'similar' });
    expect(sameLookupValue('Nasr City', 'Madenet Nasr', catalog)).toBe(false);
  });
  it('keeps short exact labels, distinct cuisine categories, and all useful fuzzy results', () => {
    const catalog = buildLookupCatalog('cuisine', ['BB', 'Sushi', 'Japanese', 'Bowls']);
    expect(exactLookupEntry('bb', catalog).name).toBe('BB');
    expect(sameLookupValue('Sushi', 'Japanese', catalog)).toBe(false);
    const areas = buildLookupCatalog('location', ['Garden City', 'Garden Citi']);
    expect(searchLookupCatalog('Gardn City', areas).filter(row => row.match === 'similar')).toHaveLength(2);
  });
  it('uses registry IDs and labels in preference to cached restaurant spellings', () => {
    const rows = [{ id: 'stable-id', kind: 'location', name: 'Nasr City', context: 'Cairo', aliases: ['Madenet Nasr', 'مدينة نصر'] }];
    const catalog = buildLookupCatalog('location', ['Madenet Nasr', 'Nasr City'], rows);
    expect(catalog).toHaveLength(1);
    expect(exactLookupEntry('Madenet Nasr', catalog).id).toBe('stable-id');
  });
  it('previews exact import changes, discards foreign IDs, and leaves uncertain terms unchanged', () => {
    const catalogs = { location: buildLookupCatalog('location', ['Maadi']), cuisine: buildLookupCatalog('cuisine', ['Chinese']) };
    const incoming = [{ name: 'Fixture', location: ' MAADI ', cuisine: 'Chinise', locationId: 'foreign-id' }];
    const result = normalizeImportedLookups(incoming, catalogs);
    expect(result.restaurants[0]).toMatchObject({ location: 'Maadi', cuisine: 'Chinise', cuisineId: null });
    expect(result.restaurants[0].locationId).not.toBe('foreign-id');
    expect(result.changes).toEqual([{ index: 0, kind: 'location', from: ' MAADI ', to: 'Maadi' }]);
    expect(incoming[0].location).toBe(' MAADI ');
  });
});
