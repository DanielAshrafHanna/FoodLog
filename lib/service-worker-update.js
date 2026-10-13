// Only reload an older document. A freshly loaded matching shell already has
// the new assets and does not need to disappear a second time on clients.claim.
export function readWorkerBuild(worker, { timeout = 1500, Channel = MessageChannel } = {}) {
  return new Promise(resolve => {
    const channel = new Channel();
    const finish = build => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(build);
    };
    const timer = setTimeout(() => finish(null), timeout);
    channel.port1.onmessage = event => finish(typeof event.data?.buildId === 'string' ? event.data.buildId : null);
    try { worker.postMessage({ type: 'FOODLOG_BUILD' }, [channel.port2]); }
    catch { finish(null); }
  });
}

export function watchWorkerUpdates({ serviceWorker, buildId, reload, readBuild = readWorkerBuild }) {
  let refreshing = false;
  const onChange = async () => {
    const worker = serviceWorker.controller;
    if (!worker || refreshing) return;
    const workerBuild = await readBuild(worker);
    if (refreshing || serviceWorker.controller !== worker) return;
    if (workerBuild && workerBuild === buildId) return;
    // Unknown legacy workers retain the existing update behavior.
    refreshing = true;
    reload();
  };
  serviceWorker.addEventListener('controllerchange', onChange);
  return () => serviceWorker.removeEventListener('controllerchange', onChange);
}
