import { describe, it, expect, vi } from 'vitest';
import { afterOverlayExit, prepareOverlayOpen } from '../lib/overlay-motion.js';

function pendingDialog() {
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  return { dialog: { open: false, getAnimations: () => [{ effect: { getTiming: () => ({ iterations: 1 }) }, finished }] }, finish };
}
describe('overlay visual cleanup ownership', () => {
  it('waits for the visual exit without delaying logical close', async () => {
    const { dialog, finish } = pendingDialog(); const cleanup = vi.fn();
    afterOverlayExit(dialog, cleanup);
    expect(dialog.open).toBe(false); expect(cleanup).not.toHaveBeenCalled();
    finish(); await vi.waitFor(() => expect(cleanup).toHaveBeenCalledTimes(1));
  });
  it('flushes the old reset before a rapid reopen and never clears new input later', async () => {
    const { dialog, finish } = pendingDialog(); let value = 'Saved playlist';
    afterOverlayExit(dialog, () => { value = ''; });
    prepareOverlayOpen(dialog); expect(value).toBe('');
    dialog.open = true; value = 'New draft';
    finish(); await Promise.resolve(); await Promise.resolve();
    expect(value).toBe('New draft');
  });
  it('does not let an older exit replace cleanup from a more recent close', async () => {
    const old = pendingDialog(); const recent = pendingDialog(); const first = vi.fn(), second = vi.fn();
    afterOverlayExit(old.dialog, first);
    old.dialog.getAnimations = recent.dialog.getAnimations;
    afterOverlayExit(old.dialog, second);
    old.finish(); await Promise.resolve(); await Promise.resolve(); expect(first).not.toHaveBeenCalled();
    recent.finish(); await vi.waitFor(() => expect(second).toHaveBeenCalledTimes(1));
  });
  it('cleans up immediately without animation support', () => {
    const cleanup = vi.fn(); afterOverlayExit({ open: false }, cleanup); expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
