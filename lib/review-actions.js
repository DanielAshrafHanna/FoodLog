// Restore only the exact soft-deletion offered by Undo, never a later revision.
export async function updateOwnReviewTrash(client, { type, id, email, deletedAt }, restore = false) {
  if (!['dish', 'restaurant'].includes(type) || !id || !email || !deletedAt) throw new Error('Choose a review to recover.');
  const dish = type === 'dish';
  const { data, error } = await client.from(dish ? 'dish_ratings' : 'restaurant_ratings')
    .update(restore ? { deleted_at: null, deleted_by: null } : { deleted_at: deletedAt, deleted_by: email })
    .eq(dish ? 'dish_id' : 'restaurant_id', id)
    .eq('rater_email', email)
    [restore ? 'eq' : 'is']('deleted_at', restore ? deletedAt : null)
    .select('rater_email').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This review changed. Refresh the place or check Trash.');
}

// Delegated handlers survive keyed rendering. Never block native page scrolling.
export function bindOwnReviewPress(root, open) {
  let held = null;
  let timer = null;
  let suppressRow = null;
  const cancel = () => { clearTimeout(timer); timer = null; held = null; };
  root.addEventListener('pointerdown', event => {
    cancel();
    suppressRow = null;
    if (event.isPrimary === false || event.button !== 0) return;
    const row = event.target.closest('[data-own-review]');
    if (!row || event.target.closest('button, a, input, textarea')) return;
    held = { row, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    timer = setTimeout(() => {
      const active = held;
      cancel();
      if (!active?.row.isConnected) return;
      suppressRow = active.row;
      open(active.row);
    }, 520);
  });
  root.addEventListener('pointermove', event => {
    if (held && (event.pointerId !== held.pointerId || Math.hypot(event.clientX - held.x, event.clientY - held.y) > 10)) cancel();
  });
  root.addEventListener('pointerup', cancel);
  root.addEventListener('pointercancel', cancel);
  root.ownerDocument.addEventListener('scroll', cancel, true);
  root.ownerDocument.defaultView.addEventListener('blur', cancel);
  root.addEventListener('contextmenu', event => {
    const row = event.target.closest('[data-own-review]');
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    open(row);
  });
  root.addEventListener('click', event => {
    if (suppressRow?.contains(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    suppressRow = null;
  }, true);
  return cancel;
}
