import { describe, expect, it, vi } from 'vitest';
import { readWorkerBuild, watchWorkerUpdates } from '../lib/service-worker-update.js';

function setup(readBuild) {
  const serviceWorker = new EventTarget();
  serviceWorker.controller = {};
  const reload = vi.fn();
  watchWorkerUpdates({ serviceWorker, buildId: 'current', reload, readBuild });
  const change = async () => {
    serviceWorker.dispatchEvent(new Event('controllerchange'));
    await Promise.resolve();
  };
  return { serviceWorker, reload, change };
}

describe('service worker release handoff', () => {
  it('keeps a matching document visible during install/claim', async () => {
    const { reload, change } = setup(async () => 'current');
    await change(); await change();
    expect(reload).not.toHaveBeenCalled();
  });
  it('reloads an older shell exactly once', async () => {
    const { reload, change } = setup(async () => 'next');
    await change(); await change();
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('retains legacy update behavior when the worker cannot answer', async () => {
    const { reload, change } = setup(async () => null);
    await change(); expect(reload).toHaveBeenCalledTimes(1);
  });
  it('ignores answers from a controller replaced during the handshake', async () => {
    let resolve;
    const { serviceWorker, reload, change } = setup(() => new Promise(r => { resolve = r; }));
    await change(); serviceWorker.controller = {};
    resolve('old'); await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();
  });
  it('reads a release through the transferred message port', async () => {
    const worker = { postMessage: (request, [port]) => {
      expect(request.type).toBe('FOODLOG_BUILD'); port.postMessage({ buildId: 'current' });
    } };
    await expect(readWorkerBuild(worker)).resolves.toBe('current');
  });
  it('settles timeouts and failed messaging without hanging startup', async () => {
    await expect(readWorkerBuild({ postMessage() {} }, { timeout: 10 })).resolves.toBeNull();
    await expect(readWorkerBuild({ postMessage() { throw Error('gone'); } })).resolves.toBeNull();
  });
});
