// Native dialogs keep ownership of focus, modality and logical close timing.
// This module only coordinates input-aware motion and visual cleanup.
const exitOwners = new WeakMap();

export function afterOverlayExit(dialog, cleanup) {
  const owner = { cleanup };
  exitOwners.set(dialog, owner);
  const finish = () => {
    if (!dialog.open && exitOwners.get(dialog) === owner) {
      exitOwners.delete(dialog);
      cleanup();
    }
  };
  const animations = dialog.getAnimations?.().filter(animation =>
    Number.isFinite(animation.effect?.getTiming().iterations)
  ) ?? [];
  if (!animations.length) finish();
  else Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(finish);
}

// Flush an old visual reset before the next opener populates new values.
export function prepareOverlayOpen(dialog) {
  const owner = exitOwners.get(dialog);
  exitOwners.delete(dialog);
  if (owner && !dialog.open) owner.cleanup();
}

export function bindOverlayMotion(doc = document) {
  const root = doc.documentElement;
  // Retaining a closing top-layer card also requires removing it from access/focus.
  const dialogs = [...doc.querySelectorAll('dialog.t-modal, dialog.sheet')];
  // Popover support alone doesn't prove that a browser fires dialog lifecycle events.
  const probe = doc.createElement('dialog');
  const states = new Set();
  probe.addEventListener('beforetoggle', event => states.add(event.newState));
  try { probe.show(); probe.close(); } catch { /* Use immediate native closing. */ }
  const lifecycle = states.has('open') && states.has('closed');
  root.dataset.overlayLifecycle = String(lifecycle);
  const onDialogToggle = event => {
    const closed = event.newState === 'closed';
    event.currentTarget.inert = closed;
    if (closed) event.currentTarget.setAttribute('aria-hidden', 'true');
    else event.currentTarget.removeAttribute('aria-hidden');
  };
  if (lifecycle) dialogs.forEach(dialog => dialog.addEventListener('beforetoggle', onDialogToggle));
  const onPointer = event => {
    if (event.isPrimary !== false) root.dataset.overlayInput = 'pointer';
  };
  const onKey = event => {
    if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) root.dataset.overlayInput = 'keyboard';
  };
  const account = doc.querySelector('#accountMenu');
  const likes = doc.querySelector('#dishLikesPopover');
  const popovers = [account, likes].filter(Boolean);
  if (lifecycle) popovers.forEach(popover => popover.addEventListener('beforetoggle', onDialogToggle));
  const positionAccount = event => {
    if (event.newState !== 'open') return;
    const trigger = doc.querySelector('#accountMenuButton');
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const vh = doc.defaultView.innerHeight;
    const vw = doc.defaultView.innerWidth;
    const opensUpward = box.top > vh / 2;
    const isLeftSide = box.left + box.width / 2 < vw / 2;
    if (opensUpward) {
      const bottom = Math.max(12, Math.round(vh - box.top + 10));
      account.style.top = 'auto';
      account.style.bottom = `${bottom}px`;
      if (isLeftSide && vw > 980) {
        account.style.left = `${Math.max(12, Math.round(box.right + 12))}px`;
        account.style.right = 'auto';
        account.style.transformOrigin = 'bottom left';
      } else {
        account.style.left = 'auto';
        account.style.right = `${Math.max(12, Math.round(vw - box.right))}px`;
        account.style.transformOrigin = 'bottom right';
      }
      account.style.maxHeight = `calc(100dvh - ${bottom + 20}px)`;
    } else {
      const top = Math.round(box.bottom + 8);
      account.style.bottom = 'auto';
      account.style.left = 'auto';
      account.style.top = `${top}px`;
      account.style.right = `${Math.max(12, Math.round(vw - box.right))}px`;
      account.style.maxHeight = `calc(100dvh - ${top + 12}px)`;
      account.style.transformOrigin = 'top right';
    }
  };
  const onResize = () => {
    if (account?.matches(':popover-open')) positionAccount({ newState: 'open' });
  };
  doc.defaultView.addEventListener('resize', onResize);
  doc.addEventListener('pointerdown', onPointer, true);
  doc.addEventListener('keydown', onKey, true);
  account?.addEventListener('beforetoggle', positionAccount);
  return () => {
    doc.defaultView.removeEventListener('resize', onResize);
    doc.removeEventListener('pointerdown', onPointer, true);
    doc.removeEventListener('keydown', onKey, true);
    account?.removeEventListener('beforetoggle', positionAccount);
    if (lifecycle) [...dialogs, ...popovers].forEach(dialog => dialog.removeEventListener('beforetoggle', onDialogToggle));
    delete root.dataset.overlayInput;
    delete root.dataset.overlayLifecycle;
  };
}
