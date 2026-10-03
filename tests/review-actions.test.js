// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { updateOwnReviewTrash, bindOwnReviewPress } from '../lib/review-actions.js';

describe('guarded review Trash mutations', () => {
  function mock(result) {
    const calls = [];
    const query = Object.fromEntries(['update', 'eq', 'is', 'select'].map(name => [name, (...args) => { calls.push([name, ...args]); return query; }]));
    query.maybeSingle = async () => result;
    return { client: { from: table => { calls.push(['from', table]); return query; } }, calls };
  }
  it('restores only the offered deletion on the author’s exact dish', async () => {
    const { client, calls } = mock({ data: { rater_email: 'you@example.com' }, error: null });
    await updateOwnReviewTrash(client, { type: 'dish', id: 'dish-1', email: 'you@example.com', deletedAt: '2026-10-03T12:00:00Z' }, true);
    expect(calls).toContainEqual(['from', 'dish_ratings']);
    expect(calls).toContainEqual(['eq', 'dish_id', 'dish-1']);
    expect(calls).toContainEqual(['eq', 'rater_email', 'you@example.com']);
    expect(calls).toContainEqual(['eq', 'deleted_at', '2026-10-03T12:00:00Z']);
    expect(calls).toContainEqual(['update', { deleted_at: null, deleted_by: null }]);
  });
  it('does not report success for a newer or inaccessible review', async () => {
    const { client } = mock({ data: null, error: null });
    await expect(updateOwnReviewTrash(client, { type: 'restaurant', id: 'r-1', email: 'you@example.com', deletedAt: 'old' }, true)).rejects.toThrow('review changed');
  });
  it('preserves remote errors rather than pretending to restore', async () => {
    const { client } = mock({ data: null, error: new Error('Offline') });
    await expect(updateOwnReviewTrash(client, { type: 'restaurant', id: 'r-1', email: 'you@example.com', deletedAt: 'old' })).rejects.toThrow('Offline');
  });
});

describe('optional review hold gestures', () => {
  afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
  function fixture() {
    vi.useFakeTimers();
    const root = document.createElement('div');
    root.innerHTML = '<div data-own-review><p>Review text</p><button>Actions</button></div>';
    document.body.append(root);
    const open = vi.fn();
    bindOwnReviewPress(root, open);
    return { root, text: root.querySelector('p'), open };
  }
  function pointer(target, type, extras = {}) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 20, clientY: 20 }, extras);
    target.dispatchEvent(event);
  }
  it('opens after a hold and suppresses the generated click', () => {
    const { root, text, open } = fixture();
    const click = vi.fn(); root.addEventListener('click', click);
    pointer(text, 'pointerdown'); vi.advanceTimersByTime(520);
    text.click();
    expect(open).toHaveBeenCalledOnce(); expect(click).not.toHaveBeenCalled();
  });
  it.each(['move', 'scroll', 'cancel', 'removed', 'second-pointer'])('cancels on %s', reason => {
    const { root, text, open } = fixture();
    pointer(text, 'pointerdown');
    if (reason === 'move') pointer(text, 'pointermove', { clientY: 40 });
    if (reason === 'scroll') root.dispatchEvent(new Event('scroll'));
    if (reason === 'cancel') pointer(text, 'pointercancel');
    if (reason === 'removed') root.remove();
    if (reason === 'second-pointer') pointer(text, 'pointerdown', { pointerId: 2, isPrimary: false });
    vi.advanceTimersByTime(600); expect(open).not.toHaveBeenCalled();
  });
});
