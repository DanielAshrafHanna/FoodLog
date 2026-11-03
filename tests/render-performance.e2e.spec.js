import { test, expect } from '@playwright/test';
import { boot, openA } from './fixtures/navigation.js';

// Disposable local/cloud mocks only. No production reads or writes.
test('restoring many carousels batches geometry before pagination writes', async ({ page, context }) => {
  await boot(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.evaluate(async () => {
    const { createDetailViewStore } = await import('/lib/detail-view.js');
    const { mountDishCarousels } = await import('/lib/photo-gallery.js');
    const panel = document.createElement('section');
    panel.id = 'restore-probe'; panel.dataset.restaurantId = 'fixture';
    panel.style.cssText = 'position:fixed;inset:0;overflow:auto;background:white';
    panel.innerHTML = Array.from({ length: 40 }, (_, i) => `<article class="dish-card" data-dish-id="probe-${i}"><div class="dish-carousel"><div class="dish-photo-track" style="width:320px;height:40px;overflow:auto;display:flex"><div style="width:320px;flex:none"></div><div style="width:320px;flex:none"></div></div><span data-photo-position></span><button data-action="dish-photo-prev"></button><button data-action="dish-photo-next"></button></div></article>`).join('');
    document.body.append(panel); mountDishCarousels(panel);
    window.__probeStore = createDetailViewStore(() => panel); window.__probeStore.capture('fixture');
    for (const track of panel.querySelectorAll('.dish-photo-track')) { track.scrollLeft = 320; track.dispatchEvent(new Event('scroll')); }
    await new Promise(requestAnimationFrame);
  });
  const before = (await cdp.send('Performance.getMetrics')).metrics;
  await page.evaluate(() => window.__probeStore.restore('fixture'));
  const after = (await cdp.send('Performance.getMetrics')).metrics;
  const value = (metrics, name) => metrics.find(item => item.name === name).value;
  // Allows bounded browser work, rejects the old 39 forced layouts.
  expect(value(after, 'LayoutCount') - value(before, 'LayoutCount')).toBeLessThanOrEqual(2);
  await expect(page.locator('#restore-probe [data-photo-position]')).toHaveText(Array(40).fill('1 / 2'));
  expect(await page.locator('#restore-probe .dish-photo-track').evaluateAll(nodes => nodes.every(node => node.scrollLeft === 0))).toBe(true);
});

test('unchanged catalog refresh retains detail, while a real alias update repaints', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await boot(page); await openA(page);
  await page.evaluate(() => {
    window.__templates = 0;
    const create = document.createElement.bind(document);
    document.createElement = (...args) => { if (args[0] === 'template') window.__templates++; return create(...args); };
  });
  const refresh = async () => {
    const reads = await page.evaluate(() => window.__reads);
    await page.getByRole('button', { name: 'Open account menu', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Refresh log', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__reads)).toBeGreaterThan(reads);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  await refresh();
  expect(await page.evaluate(() => window.__templates)).toBe(0);
  await page.evaluate(() => { window.__catalog = [{ id: 'fixture-location', kind: 'location', name: 'Maadi Gardens', aliases: ['Maadi'], retired: false }]; });
  await refresh();
  await expect(page.locator('#detailPanel')).toContainText('Maadi Gardens');
  expect(await page.evaluate(() => window.__templates)).toBeGreaterThan(0);
});


test('zoomed panning reclamps after a viewport resize during the gesture', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await boot(page); await openA(page);
  await page.locator('.dish-gallery-cover').first().click();
  const viewer=page.locator('#sharedGallery'), viewport=viewer.locator('.gallery-viewport');
  const zoom=viewer.locator('[data-gallery-zoom]');
  await expect(zoom).toBeEnabled(); await zoom.click();
  const pointer = async (type) => viewport.evaluate((el,type)=>el.dispatchEvent(new PointerEvent(type,{
    bubbles:true,button:0,pointerId:31,pointerType:'touch',isPrimary:true,clientX:type==='pointerdown'?50:2000,clientY:100
  })),type);
  await pointer('pointerdown'); await pointer('pointermove');
  await page.setViewportSize({width:320,height:700});
  await expect.poll(()=>viewport.evaluate(el=>{
    const image=el.querySelector('img');const x=new DOMMatrixReadOnly(getComputedStyle(image).transform).m41;
    return Math.abs(x)<=el.clientWidth*0.75+1;
  })).toBe(true);
  await pointer('pointermove');
  const x=await viewport.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el.querySelector('img')).transform).m41);
  expect(x).toBeLessThanOrEqual((await viewport.evaluate(el=>el.clientWidth))*0.75+1);
  await pointer('pointerup'); await zoom.click();
  await expect(zoom).toHaveAttribute('aria-pressed','false');
});
