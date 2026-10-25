// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowseOrder, createNavigationController, compareBrowseRestaurants, resolveBrowseSelection } from '../lib/navigation.js';
import { createDetailViewStore, reconcileDetailMarkup } from '../lib/detail-view.js';

afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });

describe('navigation intent ownership', () => {
  it('captures outgoing state and rejects old close timers/frames after Forward', () => {
    vi.useFakeTimers();
    const capture = vi.fn(), cancel = vi.fn();
    const navigation = createNavigationController({ captureView: capture, cancelPending: cancel });
    let screen = 'detail';
    const close = navigation.begin();
    setTimeout(navigation.guard(close, () => { screen = 'list'; }), 180);
    const oldFrame = navigation.guard(close, () => { screen = 'stale'; });
    const open = navigation.begin();
    oldFrame(); vi.advanceTimersByTime(200);
    expect(screen).toBe('detail');
    expect(navigation.isCurrent(open)).toBe(true);
    expect(capture).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledTimes(2);
  });
  it('invalidates motion without overwriting a stored outgoing view', () => {
    const capture = vi.fn();
    const navigation = createNavigationController({ captureView: capture });
    const intent = navigation.begin();
    navigation.invalidate();
    expect(navigation.isCurrent(intent)).toBe(false);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe('browse selection and sorting', () => {
  const all = [{ id: 'a' }, { id: 'b' }];
  it('pins an existing open place outside the refreshed filtered subset', () => {
    expect(resolveBrowseSelection({ selectedId: 'a', visible: [all[1]], all, preserveSelected: true })).toBe('a');
    expect(resolveBrowseSelection({ selectedId: 'a', visible: [all[1]], all })).toBe('b');
    expect(resolveBrowseSelection({ selectedId: 'gone', visible: [], all, emptyPlaylist: true })).toBeNull();
  });
  it('uses deterministic ties without changing recent/name/rating order', () => {
    const a = { id: 'a', name: 'A', updatedAt: 2, rating: 3 };
    const b = { id: 'b', name: 'B', updatedAt: 1, rating: 4 };
    const rating = item => item.rating;
    expect(compareBrowseRestaurants(a, b, 'recent', rating)).toBeLessThan(0);
    expect(compareBrowseRestaurants(a, b, 'name', rating)).toBeLessThan(0);
    expect(compareBrowseRestaurants(a, b, 'rating', rating)).toBeGreaterThan(0);
    expect(compareBrowseRestaurants(a, { ...a, id: 'b' }, 'rating', rating)).toBeLessThan(0);
  });
});

describe('detail preservation', () => {
  function panel() {
    const node = document.createElement('section'); document.body.append(node);
    node.dataset.restaurantId = 'a';
    node.getBoundingClientRect = () => ({ top: 100, bottom: 600, height: 500 });
    return node;
  }
  const markup = '<div class="section-heading detail-dishes-heading">Dishes</div><div class="dish-grid"><article class="dish-card" data-dish-id="dish"><button>Photo</button></article></div><div class="detail-grid">Ratings</div><div class="section-heading detail-photos-heading">Photos</div><div class="restaurant-photo-grid"></div>';
  it('keeps unchanged cards attached and focused while adding the first review', () => {
    const root = panel();
    reconcileDetailMarkup(root, markup);
    const card = root.querySelector('.dish-card'); const button = card.querySelector('button'); button.focus();
    const observer = new MutationObserver(() => {}); observer.observe(root, { childList: true, subtree: true });
    reconcileDetailMarkup(root, markup.replace('Ratings', 'Ratings: 4 / 5') + '<div class="ratings-breakdown">First review</div>');
    expect(root.querySelector('.dish-card')).toBe(card);
    expect(document.activeElement).toBe(button);
    expect(root.firstElementChild.classList.contains('detail-dishes-heading')).toBe(true);
    expect(observer.takeRecords().flatMap(record => [...record.removedNodes])).not.toContain(card);
    observer.disconnect();
  });
  it('anchors visible content when content above it grows and preserves fractional photo offsets', () => {
    const root = panel();
    root.innerHTML = '<article class="dish-card" data-dish-id="dish"><div class="dish-photo-track"><button></button><button></button></div></article>';
    const card = root.firstElementChild, track = card.firstElementChild;
    let contentTop = 300;
    card.getBoundingClientRect = () => ({ top: contentTop - root.scrollTop, bottom: contentTop - root.scrollTop + 500 });
    Object.defineProperty(track, 'clientWidth', { value: 200 });
    root.scrollTop = 250; track.scrollLeft = 140;
    const store = createDetailViewStore(() => root); store.capture();
    contentTop += 120; track.scrollLeft = 0;
    store.restore();
    expect(root.scrollTop).toBe(370);
    expect(track.scrollLeft).toBe(140);
  });
  it('starts an unseen place at the top without losing saved return positions', () => {
    const root = panel(); const store = createDetailViewStore(() => root);
    root.scrollTop = 640; store.capture('a');
    root.dataset.restaurantId = 'b'; store.restore('b');
    expect(root.scrollTop).toBe(0);
    root.scrollTop = 200; store.capture('b');
    root.dataset.restaurantId = 'a'; store.restore('a');
    expect(root.scrollTop).toBe(640);
    store.restore('b'); expect(root.scrollTop).toBe(640);
  });
  it('does not overwrite a saved detail position when its retained tree is hidden', () => {
    const root = panel(); const store = createDetailViewStore(() => root);
    root.scrollTop = 640; store.capture();
    root.getBoundingClientRect = () => ({ height: 0 }); root.scrollTop = 0;
    expect(store.capture()).toBeNull();
    root.getBoundingClientRect = () => ({ top: 100, bottom: 600, height: 500 });
    store.restore(); expect(root.scrollTop).toBe(640);
  });
});


describe('background browse ordering', () => {
  it('refreshes data without moving existing rows; accepts the newest order explicitly', () => {
    const order = createBrowseOrder();
    const a = { id: 'a', name: 'A' }, b = { id: 'b' }, c = { id: 'c' };
    expect(order.present([a, b], 'recent').pending).toBe(false);
    const changed = { ...b, name: 'Fresh B' };
    const held = order.present([changed, c, a], 'recent');
    expect(held.items).toEqual([a, changed, c]);
    expect(held.pending).toBe(true);
    order.accept();
    expect(order.present([changed, c, a], 'recent')).toEqual({items:[changed,c,a],pending:false});
    expect(order.present([a, c], 'name')).toEqual({items:[a,c],pending:false});
    expect(order.present([c], 'name')).toEqual({items:[c],pending:false});
  });
});
