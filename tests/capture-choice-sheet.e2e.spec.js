import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const fixture = {
  id: "picker-fixture", name: "Harbor Table", location: "Maadi", cuisine: "Egyptian",
  playlists: ["Date night", "Weekend tables"], maps: "", dishes: [], photos: [], ratings: [], visited: []
};

async function bootPhone(page, options = {}) {
  await page.setViewportSize({ width: options.width ?? 390, height: 844 });
  await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  await page.addInitScript(row => {
    if (!localStorage.getItem("plate-log-data-v1")) localStorage.setItem("plate-log-data-v1", JSON.stringify([row]));
  }, fixture);
  await page.goto("/");
  await page.getByRole("button", { name: "Add restaurant", exact: true }).click();
  return page.locator("#restaurantModal");
}

test("browsing choices is keyboard-free and search fits above a shortened visual viewport", async ({ page }) => {
  const form = await bootPhone(page, { width: 320 });
  await page.addScriptTag({ content: await readFile("node_modules/axe-core/axe.min.js", "utf8") });
  const trigger = form.getByRole("button", { name: "Choose cuisine", exact: true });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Choose cuisine", exact: true });
  const search = sheet.getByRole("searchbox", { name: "Search cuisines", exact: true });
  await expect(sheet.getByRole("button", { name: "Close choices" })).toBeFocused();
  await expect(search).not.toBeFocused();
  expect(await sheet.locator(".capture-lookup-results").evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await search.click();
  const visible = { height: 365, top: 38 };
  await page.evaluate(({ height, top }) => {
    Object.defineProperties(visualViewport, {
      height: { configurable: true, get: () => height },
      offsetTop: { configurable: true, get: () => top }
    });
    visualViewport.dispatchEvent(new Event("resize"));
  }, visible);
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    return box.y >= visible.top - 1 && box.y + box.height <= visible.top + visible.height + 1;
  }).toBe(true);
  await search.fill("Korean");
  await expect(sheet.getByRole("button", { name: "Korean", exact: true })).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(dark => document.documentElement.classList.toggle("dark-theme", dark), dark);
    expect(await sheet.evaluate(async el => (await window.axe.run(el, {
      runOnly: { type: "rule", values: ["color-contrast", "label", "button-name"] }
    })).violations.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({
      target: node.target, evidence: node.failureSummary
    })) })))).toEqual([]);
  }
  await search.press("ArrowDown");
  await expect(sheet.getByRole("button", { name: "Korean", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(sheet).toBeHidden();
  await expect(form.getByRole("button", { name: "Korean, change cuisine" })).toBeFocused();
  await expect(form.locator("#cuisineSelect")).toHaveValue("Korean");
});

test("close discards search text, new areas require confirmation, and drafts keep committed choices", async ({ page }) => {
  const form = await bootPhone(page);
  await form.getByLabel("Restaurant name", { exact: true }).fill("New Harbor");
  const sheet = page.locator("#captureChoiceSheet");
  const trigger = form.locator('[data-lookup-for="locationSelect"]');
  await trigger.click();
  await sheet.getByRole("searchbox").fill("معادي");
  await sheet.getByRole("button", { name: /Maadi/ }).click();
  await expect(trigger).toHaveText("Maadi");
  await trigger.click();
  await expect(sheet.locator('[aria-current="true"]')).toContainText("Maadi");
  await sheet.getByRole("searchbox").fill("Garden Square");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText("Maadi");
  await trigger.click();
  await sheet.getByRole("button", { name: "Clear location" }).click();
  await expect(trigger).toHaveText("Choose location");
  await trigger.click();
  await sheet.getByRole("searchbox").fill("Garden Square");
  await sheet.getByRole("button", { name: "Add “Garden Square”", exact: true }).click();
  await expect(sheet.getByText("Use “Garden Square” as a new location?")).toBeVisible();
  await expect(form.locator("#locationSelect")).toHaveValue("");
  await sheet.getByRole("button", { name: "Create new location" }).click();
  await expect(trigger).toHaveText("Garden Square");
  await trigger.click();
  await expect(sheet.locator('[aria-current="true"]')).toContainText("Garden Square");
  await sheet.getByRole("button", { name: "Close choices" }).click();
  await form.locator("#closeRestaurantModal").click();
  await page.getByRole("button", { name: "Add restaurant", exact: true }).click();
  await expect(trigger).toHaveText("Garden Square");
  await form.getByRole("button", { name: "Save restaurant", exact: true }).click();
  await expect(form.locator("#restaurantSuccess")).toBeVisible();
});

test("phone playlist choices keep their selection through search and return to the same form", async ({ page }) => {
  const form = await bootPhone(page);
  await form.getByLabel("Restaurant name", { exact: true }).fill("Playlist Test Table");
  await form.getByRole("button", { name: /More details/ }).click();
  const trigger = form.locator("#openRestaurantPlaylists");
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Choose playlists" });
  await expect(sheet.getByRole("button", { name: "Done", exact: true })).toBeFocused();
  await sheet.getByRole("checkbox", { name: "Date night", exact: true }).check();
  await sheet.getByRole("searchbox").fill("Weekend");
  await sheet.getByRole("checkbox", { name: "Weekend tables" }).check();
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await expect(trigger).toHaveText("Date night +1");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(sheet.getByRole("searchbox")).toHaveValue("");
  await expect(sheet.getByRole("checkbox", { name: "Date night" })).toBeChecked();
  await expect(sheet.getByRole("checkbox", { name: "Weekend tables" })).toBeChecked();
  await sheet.getByRole("button", { name: "Done", exact: true }).click();
  await form.getByRole("button", { name: "Save restaurant", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("plate-log-data-v1")).find(r => r.name === "Playlist Test Table"));
  expect(saved.playlists).toEqual(["Date night", "Weekend tables"]);
});

test("the phone results scroll independently of the editor under a touch swipe", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Native touch scrolling contract.");
  const form = await bootPhone(page);
  await form.getByRole("button", { name: "Choose cuisine" }).tap();
  const results = page.locator(".capture-lookup-results");
  const before = await form.locator("#restaurantEditorBody").evaluate(el => el.scrollTop);
  const { x, y, width } = await results.boundingBox();
  const session = await page.context().newCDPSession(page);
  try {
    const move = (type, top) => session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: x + width / 2, y: top }]
    });
    await move("touchStart", y + 180);
    for (let i = 1; i <= 8; i += 1) {
      await move("touchMove", y + 180 - i * 12);
      await page.waitForTimeout(16);
    }
    await move("touchEnd");
    await expect.poll(() => results.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
    expect(await form.locator("#restaurantEditorBody").evaluate(el => el.scrollTop)).toBe(before);
    await expect(page.locator("#captureChoiceSheet")).toBeVisible();
  } finally {
    await session.detach();
  }
});
