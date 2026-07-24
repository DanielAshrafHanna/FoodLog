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

test("uses a bookmark marker for restaurants saved to Want to go", async ({ page }) => {
  const firstRestaurant = page.locator(".restaurant-row").first();
  await firstRestaurant.locator('[data-action="toggle-want"]').click();
  await expect(firstRestaurant.locator(".want-to-go-mark")).toBeVisible();
  await expect(firstRestaurant.getByText("Saved", { exact: true })).toHaveCount(0);
  await expect(firstRestaurant.locator('[data-action="toggle-want"]')).toHaveAttribute("aria-pressed", "true");
});

test("warns about similar restaurants and requires an explicit separate-place confirmation", async ({ page }) => {
  await page.getByRole("button", { name: "Add place" }).click();
  const dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await dialog.getByLabel("Restaurant name").fill("Silk Road Restaurant");

  const warning = page.locator("#restaurantDuplicateWarning");
  await expect(warning).toBeVisible();
  await expect(warning.getByText("This place may already be in FoodLog")).toBeVisible();
  await expect(warning.getByText("Silkroad", { exact: true })).toBeVisible();
  await expect(warning.getByRole("button", { name: "Open existing" })).toBeVisible();

  await dialog.locator("#locationSelect").selectOption({ label: "Maadi" });
  await dialog.locator("#cuisineSelect").selectOption({ label: "Korean" });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Review the possible duplicate below")).toBeVisible();

  await dialog.getByLabel("I checked — add this as a separate restaurant anyway.").check();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".restaurant-row")).toHaveCount(4);
});

test("chooses a main restaurant photo without removing gallery images", async ({ page }, testInfo) => {
  const newestPhoto = `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#f05a28"/></svg>'
  ).toString("base64")}`;
  const chosenPhoto = `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#174a3b"/></svg>'
  ).toString("base64")}`;

  await page.evaluate(
    ({ newest, chosen }) => {
      localStorage.setItem("plate-log-data-v1", JSON.stringify([{
        id: "cover-photo-restaurant",
        name: "Cover Photo Cafe",
        location: "Maadi",
        cuisine: "Cafe",
        price: "$$",
        ratings: [],
        maps: "",
        notes: "",
        visited: [],
        playlists: [],
        updatedAt: Date.now(),
        photos: [
          { id: "photo-newest", photo: newest, photoPath: "", createdAt: 2 },
          { id: "photo-chosen", photo: chosen, photoPath: "", createdAt: 1 }
        ],
        dishes: []
      }]));
    },
    { newest: newestPhoto, chosen: chosenPhoto }
  );
  await page.reload();

  const row = page.locator(".restaurant-row").first();
  await expect(row.locator(".restaurant-ticket-media img")).toHaveAttribute("src", newestPhoto);
  await row.click();
  await page.locator('[data-action="set-cover-photo"][data-photo-id="photo-chosen"]').click();
  await expect(page.locator(".restaurant-photo-card.is-cover .photo-cover-badge")).toHaveText("Main photo");

  if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: "Back to places" }).click();
  }
  await expect(page.locator(".restaurant-row").first().locator(".restaurant-ticket-media img"))
    .toHaveAttribute("src", chosenPhoto);

  const savedPhotos = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("plate-log-data-v1"));
    return stored[0].photos;
  });
  expect(savedPhotos).toHaveLength(2);
  expect(savedPhotos.filter((photo) => photo.isCover).map((photo) => photo.id)).toEqual(["photo-chosen"]);
  expect(savedPhotos.every((photo) => !photo.deletedAt)).toBe(true);
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
  const addPlace = page.getByRole("button", { name: "Add place" });
  await expect(addPlace).toBeVisible();
  await expect(addPlace).toContainText("Add");
  await expect(addPlace.locator(".quick-add-icon")).toHaveText("+");
  const addPlaceBox = await addPlace.boundingBox();
  expect(addPlaceBox?.width).toBeGreaterThanOrEqual(68);
  expect(addPlaceBox?.height).toBeGreaterThanOrEqual(44);
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
  const mobileVisualContract = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll(".restaurant-row")).slice(0, 2);
    const playlistScroll = document.querySelector(".playlist-bar-scroll");
    return {
      rowBorders: rows.map((row) => getComputedStyle(row).borderTopColor),
      rowGap: rows.length === 2
        ? Math.round(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom)
        : 0,
      playlistFadeBefore: playlistScroll ? getComputedStyle(playlistScroll, "::before").content : "",
      playlistFadeAfter: playlistScroll ? getComputedStyle(playlistScroll, "::after").content : ""
    };
  });
  expect(mobileVisualContract.rowBorders).not.toContain("rgba(0, 0, 0, 0)");
  expect(mobileVisualContract.rowGap).toBeGreaterThanOrEqual(8);
  expect(mobileVisualContract.playlistFadeBefore).toBe("none");
  expect(mobileVisualContract.playlistFadeAfter).toBe("none");
  const mediaBox = await page.locator(".restaurant-ticket-media").first().boundingBox();
  expect(mediaBox?.width).toBeGreaterThanOrEqual(72);
  expect(mediaBox?.height).toBeGreaterThanOrEqual(72);
  await settings.click();
  await expect(page.getByRole("heading", { name: "Settings & sync" })).toBeVisible();
});

test("uses a focused mobile detail view with visible and swipe back navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile detail navigation contract.");
  await page.locator(".restaurant-row").first().click();

  const back = page.getByRole("button", { name: "Back to places" });
  await expect(back).toBeVisible();
  const backContract = await back.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      borderRadius: Number.parseFloat(style.borderRadius),
      borderStyle: style.borderTopStyle,
      background: style.backgroundColor
    };
  });
  expect(backContract.height).toBeGreaterThanOrEqual(44);
  expect(backContract.borderRadius).toBeGreaterThanOrEqual(8);
  expect(backContract.borderStyle).toBe("solid");
  expect(backContract.background).not.toBe("rgb(239, 239, 239)");
  await expect(page.locator("body")).toHaveClass(/mobile-detail-view/);
  await expect(page.locator(".hero-panel")).toBeHidden();

  await page.locator("#detailPanel").evaluate((element) => {
    const dispatch = (type, x, y) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
      isPrimary: true,
      pointerId: 23,
      pointerType: "touch"
    }));
    dispatch("pointerdown", 18, 260);
    dispatch("pointermove", 210, 264);
    dispatch("pointerup", 210, 264);
  });

  await expect(page.locator(".list-layout")).not.toHaveClass(/mobile-detail-open/, { timeout: 1_000 });
  await expect(page).not.toHaveURL(/place=/);
  await expect(page.locator(".restaurant-row").first()).toBeVisible();

  await page.locator(".restaurant-row").first().click();
  await page.locator("#detailPanel").evaluate((element) => {
    const dispatch = (type, x, y) => element.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
      isPrimary: true,
      pointerId: 24,
      pointerType: "touch"
    }));
    dispatch("pointerdown", 180, 280);
    dispatch("pointermove", 186, 160);
    dispatch("pointerup", 186, 160);
  });
  await expect(page.locator(".list-layout")).toHaveClass(/mobile-detail-open/);
  await page.getByRole("button", { name: "Back to places" }).click();
  await expect(page.locator(".restaurant-row").first()).toBeVisible();
});

test("renders stable ticket media and supports dark and reduced-motion modes", async ({ page }) => {
  await expect(page.locator(".restaurant-ticket-media").first()).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark-theme/);
  const darkPalette = await page.locator("html").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.getPropertyValue("--bg").trim(),
      panel: style.getPropertyValue("--panel").trim(),
      accent: style.getPropertyValue("--accent").trim(),
      highlight: style.getPropertyValue("--highlight").trim()
    };
  });
  expect(darkPalette).toEqual({
    background: "#131416",
    panel: "#1c1e22",
    accent: "#ede9e1",
    highlight: "#f39a1f"
  });
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
