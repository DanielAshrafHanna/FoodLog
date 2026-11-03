import { syncDishCarouselPosition } from './photo-gallery.js';

const markupByNode = new WeakMap();

// Reconcile in place. Do not detach unchanged cards, their focused controls,
// images, or a carousel's active touch listeners during an unrelated update.
function reconcileNodes(parent, children) {
  const retained = new Set(children);
  for (const child of [...parent.children]) if (!retained.has(child)) child.remove();
  children.forEach((child, index) => {
    const current = parent.children[index] ?? null;
    if (child !== current) parent.insertBefore(child, current);
  });
}

function reconcileGrid(current, incoming, identity) {
  const existing = new Map([...current.children].map(node => [node.getAttribute(identity), node]));
  const children = [...incoming.children].map(next => {
    const id = next.getAttribute(identity);
    const old = id && existing.get(id);
    const markup = next.outerHTML;
    if (old && (markupByNode.get(old) ?? old.outerHTML) === markup) return old;
    markupByNode.set(next, markup);
    return next;
  });
  reconcileNodes(current, children);
  return current;
}

export function reconcileDetailMarkup(panel, markup) {
  const template = panel.ownerDocument.createElement('template');
  template.innerHTML = markup;
  const key = node => node.classList.contains('section-heading') ? node.classList[1] : node.classList[0] || node.tagName;
  const existing = new Map([...panel.children].map(node => [key(node), node]));
  const children = [...template.content.children].map(next => {
    const old = existing.get(key(next));
    const markup = next.outerHTML;
    if (old && (markupByNode.get(old) ?? old.outerHTML) === markup) return old;
    if (old?.classList.contains('detail-title') || old?.classList.contains('detail-dishes-view')) {
      reconcileDetailMarkup(old, next.innerHTML);
      markupByNode.set(old, markup);
      return old;
    }
    for (const [className, identity] of [['dish-grid', 'data-dish-id'], ['restaurant-photo-grid', 'data-photo-id']]) {
      if (old?.classList.contains(className)) {
        reconcileGrid(old, next, identity);
        markupByNode.set(old, markup);
        return old;
      }
      if (next.classList.contains(className)) for (const child of next.children) markupByNode.set(child, child.outerHTML);
    }
    markupByNode.set(next, markup);
    return next;
  });
  reconcileNodes(panel, children);
}

const anchorSelector = '[data-library-key], [data-rating-email], .dish-card[data-dish-id], .restaurant-photo-card[data-photo-id], .detail-hero, .detail-title, .detail-section-nav, .restaurant-description, .detail-grid, .ratings-breakdown, .detail-dishes-heading, .detail-photos-heading';
function anchorKey(node) {
  if (node.dataset.libraryKey) return `library:${node.dataset.libraryKey}`;
  if (node.dataset.ratingEmail) return `review:${node.dataset.ratingEmail}`;
  if (node.matches('.dish-card')) return `dish:${node.dataset.dishId}`;
  if (node.dataset.photoId) return `photo:${node.dataset.photoId}`;
  return `section:${node.classList.contains('section-heading') ? node.classList[1] : node.classList[0]}`;
}

export function createDetailViewStore(getPanel) {
  const views = new Map();
  return {
    capture(restaurantId = getPanel()?.dataset.restaurantId) {
      const panel = getPanel();
      if (!restaurantId || panel?.dataset.restaurantId !== restaurantId) return null;
      const bounds = panel.getBoundingClientRect();
      if (!bounds.height) return null;
      const { top, bottom } = bounds;
      const visibleTop = Math.max(top, panel.querySelector('.detail-section-nav')?.getBoundingClientRect().bottom ?? top);
      const visible = [...panel.querySelectorAll(anchorSelector)].map(node => ({ node, rect: node.getBoundingClientRect() }))
        .filter(({rect}) => rect.bottom > visibleTop + 1 && rect.top < bottom);
      const anchor = visible.find(({rect}) => rect.top >= visibleTop) ?? visible[0];
      const view = {
        scrollTop: panel.scrollTop,
        anchor: anchor ? { key: anchorKey(anchor.node), offset: anchor.rect.top - top } : null,
        dishPhotos: new Map([...panel.querySelectorAll('.dish-card[data-dish-id]')].map(card => {
          const track = card.querySelector('.dish-photo-track');
          return [card.dataset.dishId, track ? track.scrollLeft / Math.max(track.clientWidth, 1) : 0];
        }))
      };
      views.set(restaurantId, view);
      return view;
    },
    restore(restaurantId = getPanel()?.dataset.restaurantId) {
      const panel = getPanel();
      const view = views.get(restaurantId);
      if (panel?.dataset.restaurantId !== restaurantId) return;
      if (!view) { panel.scrollTop = 0; return; }
      panel.scrollTop = view.scrollTop;
      const anchor = view.anchor && [...panel.querySelectorAll(anchorSelector)].find(node => anchorKey(node) === view.anchor.key);
      if (anchor) panel.scrollTop += anchor.getBoundingClientRect().top - panel.getBoundingClientRect().top - view.anchor.offset;
      const tracks = [...panel.querySelectorAll('.dish-card[data-dish-id]')].map(card => {
        const track = card.querySelector('.dish-photo-track');
        if (!track || !view.dishPhotos.has(card.dataset.dishId)) return null;
        const index = Math.min(view.dishPhotos.get(card.dataset.dishId), Math.max(0, track.children.length - 1));
        return { track, current: track.scrollLeft, position: index * track.clientWidth, index: Math.round(index) };
      }).filter(Boolean);
      for (const { track, current, position } of tracks) if (Math.abs(current - position) > 1) track.scrollLeft = position;
      // Update labels from the batch measurements; no per-track geometry reads.
      for (const { track, index } of tracks) syncDishCarouselPosition(track, index);
    }
  };
}
