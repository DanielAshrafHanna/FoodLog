import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

test("preserves the places, map, and picker navigation", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Keep the places. Remember the plates." })).toBeVisible();
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await expect(page.locator("#mapPanel")).toBeVisible();
  await page.getByRole("button", { name: "Pick", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pick our next place" })).toBeVisible();
  await expect(page).toHaveURL(/view=pick/);
});

test("creates a local decision, adds a candidate, votes, closes, and reopens", async ({ page }) => {
  await page.getByRole("button", { name: "Pick", exact: true }).click();
  await page.getByRole("button", { name: "New session" }).click();
  await page.getByLabel("Session title").fill("Friday dinner");
  await page.getByRole("button", { name: "Create session" }).click();
  await expect(page.getByRole("heading", { name: "Friday dinner" })).toBeVisible();
  await page.getByLabel("Add a place").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Add to shortlist" }).click();
  await page.getByRole("button", { name: /^Vote/ }).click();
  await page.getByRole("button", { name: "Close and pick" }).click();
  await expect(page.getByText("Decision made")).toBeVisible();
  await page.getByRole("button", { name: "Reopen session" }).click();
  await expect(page.getByRole("button", { name: "Close and pick" })).toBeVisible();
});

test("moves a restaurant to Trash and restores it without permanent deletion", async ({ page }) => {
  await page.locator(".restaurant-row").first().click();
  await page.locator('[data-action="edit-restaurant"]').click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Move to Trash", exact: true }).click();
  await page.getByRole("button", { name: "Open Trash" }).click();
  await expect(page.locator(".trash-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Trash is empty.")).toBeVisible();
  await page.getByRole("button", { name: "Close Trash" }).click();
  await expect(page.locator(".restaurant-row")).toHaveCount(3);
});

test("writes filter state to the URL and supports keyboard selection", async ({ page }) => {
  await page.getByLabel("Search restaurants").fill("Silkroad");
  await page.waitForTimeout(220);
  await expect(page).toHaveURL(/q=Silkroad/);
  await page.locator(".restaurant-row").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#detailPanel").getByRole("heading", { name: "Silkroad" })).toBeVisible();
  await expect(page).toHaveURL(/place=/);
});

test("has no critical automated accessibility violations on the places surface", async ({ page }) => {
  const axeSource = await readFile("node_modules/axe-core/axe.min.js", "utf8");
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () =>
    window.axe.run(document, {
      resultTypes: ["violations"],
      rules: { "color-contrast": { enabled: true } }
    })
  );
  const critical = results.violations.filter((violation) => violation.impact === "critical");
  expect(critical, critical.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
});

test("keeps Settings reachable and touch controls large enough on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile navigation contract.");
  const settings = page.getByRole("button", { name: "Open settings" });
  await expect(settings).toBeVisible();
  const box = await settings.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  const listScrollContract = await page.locator(".restaurant-list").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      overflowY: style.overflowY,
      overscrollBehaviorY: style.overscrollBehaviorY,
      isInnerScroller: element.scrollHeight > element.clientHeight
    };
  });
  expect(listScrollContract).toEqual({
    overflowY: "visible",
    overscrollBehaviorY: "auto",
    isInnerScroller: false
  });
  await settings.click();
  await expect(page.getByRole("heading", { name: "Settings & sync" })).toBeVisible();
});

test("renders stable ticket media and supports dark and reduced-motion modes", async ({ page }) => {
  await expect(page.locator(".restaurant-ticket-media").first()).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark-theme/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page.locator(".restaurant-row").first().evaluate(
    (element) => getComputedStyle(element).transitionDuration
  );
  expect(["0s", "0.000001s", "1e-06s"]).toContain(duration);
});

test("renders representative 100, 500, and 1,000-place journals", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Large dataset timing runs once on desktop.");
  for (const count of [100, 500, 1000]) {
    await page.evaluate((restaurantCount) => {
      const restaurants = Array.from({ length: restaurantCount }, (_, index) => ({
        id: `fixture-${restaurantCount}-${index}`,
        name: `Fixture place ${String(index + 1).padStart(4, "0")}`,
        location: `Area ${index % 12}`,
        cuisine: ["Egyptian", "Chinese", "Italian", "Korean"][index % 4],
        price: ["$", "$$", "$$$"][index % 3],
        ratings: [{ email: "fixture@example.com", name: "Fixture", rating: (index % 5) + 1 }],
        maps: "",
        notes: "Synthetic performance fixture",
        visited: [],
        playlists: index % 2 ? ["Try next"] : [],
        updatedAt: Date.now() - index,
        photos: [],
        dishes: [{
          id: `dish-${restaurantCount}-${index}`,
          name: "Fixture dish",
          ratings: [],
          likedBy: [],
          photo: "",
          photoPath: ""
        }]
      }));
      localStorage.setItem("plate-log-data-v1", JSON.stringify(restaurants));
    }, count);
    const startedAt = Date.now();
    await page.reload();
    await expect(page.locator(".restaurant-row")).toHaveCount(count, { timeout: 10_000 });
    expect(Date.now() - startedAt).toBeLessThan(10_000);
  }
});
