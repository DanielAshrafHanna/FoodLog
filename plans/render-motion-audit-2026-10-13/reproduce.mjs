// Historical, disposable source-level audit fixtures for the audited commit.
// Read that commit so this remains useful after the implementation is fixed.
// No app/server/network writes.
// These assertions confirm the observed bugs; they are not acceptance tests for fixes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = execFileSync('git', ['show', '24a95f8:app.js'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' });
function extract(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`\nfunction ${nextName}(`, start);
  assert(start >= 0 && end > start, `Could not extract ${name}`);
  return source.slice(start, end);
}
const dom = new JSDOM('<!doctype html><div id="detailPanel"></div>');
const panel = dom.window.document.querySelector('#detailPanel');
const timers = new Map();
let timerId = 0;
const context = vm.createContext({
  document: dom.window.document,
  window: { innerWidth: 390, setTimeout: fn => { timers.set(++timerId, fn); return timerId; } },
  state: { mobileDetailOpen: true, selectedId: 'A', activeSurface: 'places' },
  els: { detailPanel: panel },
  detailViewStateByRestaurant: new Map(),
  detailMarkupByNode: new WeakMap(),
  detailSwipeGesture: null, detailOpenGeneration: 0,
  detailSwipeSettleTimer: 0, pendingDetailOpenAnimation: false,
  pendingPopstateTransition: null, applyingHistory: false, mobileListScrollY: 0,
  DETAIL_SWIPE_SETTLE_MS: 180,
  prefersReducedMotion: () => false,
  readDetailTranslateX: () => 0,
  clearDetailSwipeTimers: () => timers.clear(),
  setDetailSwipeSettling: () => {}, setDetailSwipeDragging: () => {},
  applyDetailSwipeProgress: () => {}, detailOffscreenX: width => width + 24,
  queueDetailOpenAnimation: () => { context.detailOpenGeneration += 1; },
  render: () => {},
  requestAnimationFrame: () => {},
  paintWithTransition: paint => { paint(); return Promise.resolve(); },
  restaurantRatings: restaurant => restaurant.ratings ?? []
});
for (const [name, next] of [
  ['applyBrowseSnapshot', 'getShareUrl'],
  ['captureDetailViewState', 'restoreDetailViewState'],
  ['restoreDetailViewState', 'settleMobileDetailClosed'],
  ['settleMobileDetailClosed', 'isDetailSwipeSettling'],
  ['reconcileDetailGrid', 'reconcileDetailMarkup'],
  ['reconcileDetailMarkup', 'renderDetail'],
  ['arrangeMobileDetailSections', 'renderRestaurantPhoto'],
  ['scrollActivePlaylistChipIntoView', 'isEditablePlaylist']
]) vm.runInContext(extract(name, next), context);

// Browser Back dispatches the close; Forward arrives before its timer fires.
const back = { selectedId: 'A', mobileDetailOpen: false, activeSurface: 'places' };
const forward = { ...back, mobileDetailOpen: true };
context.settleMobileDetailClosed(() => context.applyBrowseSnapshot(back));
const pendingClose = [...timers.values()][0];
context.applyBrowseSnapshot(forward);
assert.equal(context.state.mobileDetailOpen, true);
pendingClose();
assert.equal(context.state.mobileDetailOpen, false);
console.log('REPRODUCED: an old Back callback hides the detail after Forward.');

// Actual capture guard skips the outgoing A panel when B is now selected.
panel.dataset.restaurantId = 'A'; panel.scrollTop = 640;
context.detailViewStateByRestaurant.clear();
context.captureDetailViewState('B');
assert.equal(context.detailViewStateByRestaurant.has('A'), false);
context.captureDetailViewState('A');
assert.equal(context.detailViewStateByRestaurant.get('A').scrollTop, 640);
console.log('REPRODUCED: capture with the incoming ID misses outgoing detail position.');

// A first review changes the existing mobile content order during reconciliation.
const markup = '<div class="detail-grid">Rating</div><div class="detail-photos-heading section-heading">Photos</div><div class="restaurant-photo-grid"></div><div class="detail-dishes-heading section-heading">Dishes</div><div class="dish-grid"></div>';
context.reconcileDetailMarkup(panel, markup);
context.arrangeMobileDetailSections(panel, { ratings: [] });
const order = () => [...panel.children].map(node => node.className.split(' ')[0]).join(',');
assert.equal(order(), 'detail-dishes-heading,dish-grid,detail-photos-heading,restaurant-photo-grid,detail-grid');
context.reconcileDetailMarkup(panel, markup);
context.arrangeMobileDetailSections(panel, { ratings: [{ rating: 4 }] });
assert.equal(order(), 'detail-grid,detail-dishes-heading,dish-grid,detail-photos-heading,restaurant-photo-grid');
console.log('REPRODUCED: first review moves ratings above the Dishes/Photos block.');

let scrollRequest;
context.els.playlistSwitcher = {
  clientWidth: 200,
  querySelector: () => ({ offsetLeft: 240, clientWidth: 100 }),
  scrollTo: options => { scrollRequest = options; }
};
context.prefersReducedMotion = () => true;
context.scrollActivePlaylistChipIntoView(true);
assert.equal(scrollRequest.behavior, 'smooth');
console.log('REPRODUCED: playlist centering requests smooth scrolling under reduced motion.');

// Run the actual renderer's selection prelude against a changed filtered subset.
// Rendering the rest of the application is outside this isolated fixture.
const renderStart = source.indexOf('function render() {');
const renderSelectionEnd = source.indexOf('  const selected = currentRestaurant();', renderStart);
assert(renderStart >= 0 && renderSelectionEnd > renderStart);
vm.runInContext(source.slice(renderStart, renderSelectionEnd) + '\n}', context);
context.state = { loading: false, mobileDetailOpen: true, selectedId: 'A', data: [{ id: 'A' }, { id: 'B' }] };
context.filteredRestaurants = () => [{ id: 'B' }];
context.updateFilterResultAction = () => {};
context.isEditablePlaylist = () => false;
context.activeRecords = records => records;
context.render();
assert.equal(context.state.selectedId, 'B');
assert.equal(context.state.mobileDetailOpen, true);
console.log('REPRODUCED: an open detail switches selection when a refresh removes it from filtered results.');

dom.window.close();
