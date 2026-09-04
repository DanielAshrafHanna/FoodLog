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

test("restores a saved map destination without leaving an empty Places list", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("plate-log-filters-v1", JSON.stringify({ view: "map" }));
  });
  await page.goto("/");

  await expect(page.locator("#mapPanel")).toBeVisible();
  await expect(page.locator("#listLayout")).toBeHidden();

  await page.getByRole("button", { name: "Places", exact: true }).click();
  await expect(page.locator(".restaurant-row")).toHaveCount(3);
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
  const editDialog = page.getByRole("dialog", { name: "Edit restaurant" });
  await editDialog.getByText("Danger zone", { exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Move to Trash", exact: true }).click();
  await page.getByRole("button", { name: "Open Trash" }).click();
  await expect(page.locator(".trash-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText("Trash is empty.")).toBeVisible();
  await page.getByRole("button", { name: "Close Trash" }).click();
  await expect(page.locator(".restaurant-row")).toHaveCount(3);
});

test("uses a bookmark marker for restaurants saved to my list", async ({ page }) => {
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

  await dialog.locator("#locationSelect").fill("Maadi");
  await dialog.locator("#cuisineSelect").fill("Korean");
  await dialog.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("#restaurantErrorSummary")).toContainText("Review the possible duplicate below");

  await dialog.getByLabel("I checked — add this as a separate restaurant anyway.").check();
  await dialog.getByRole("button", { name: "Save place", exact: true }).click();
  await expect(dialog.getByText("What would you like to do next?")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".restaurant-row")).toHaveCount(4);
});

test("captures a name-only restaurant, marks missing details, and bookmarks it by default", async ({ page }) => {
  await page.getByRole("button", { name: "Add place" }).click();
  const dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await expect(dialog.getByText("Not visited yet")).toBeVisible();
  await dialog.getByLabel("Restaurant name").fill("Quick Capture Cafe");
  await dialog.getByRole("button", { name: "Save place" }).click();
  await expect(dialog.getByText("What would you like to do next?")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  const row = page.locator(".restaurant-row").filter({ hasText: "Quick Capture Cafe" });
  await expect(row.getByText("Needs details")).toBeVisible();
  await expect(row.getByText("Not visited", { exact: true })).toBeVisible();
  await expect(row.locator(".want-to-go-mark")).toBeVisible();
});

test("uses visited intent, safe Maps autofill, and accessible half-star controls", async ({ page }) => {
  await page.getByRole("button", { name: "Add place" }).click();
  const dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await dialog.getByLabel(/Already visited/).check();
  await expect(dialog.getByText("Remember the visit", { exact: true })).toBeVisible();
  await dialog.locator("#planDetails > summary").click();

  await dialog.getByLabel("Google Maps link (optional)").fill(
    "https://www.google.com/maps/place/Cafe+Roma/@30.1,31.2,15z"
  );
  await dialog.getByRole("button", { name: "Check link" }).click();
  await expect(dialog.getByText("Cafe Roma", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Apply details" }).click();
  await expect(dialog.getByLabel("Restaurant name")).toHaveValue("Cafe Roma");

  await dialog.getByRole("button", { name: "Increase restaurant rating by half a star" }).click();
  await expect(dialog.locator("#ratingReadout")).toHaveText("0.5 / 5");
  await expect(dialog.getByLabel(/Add to my list/)).not.toBeChecked();
  await dialog.locator("#cancelRestaurantButton").click();
});

test("restores and explicitly discards an unsaved restaurant draft", async ({ page }) => {
  await page.getByRole("button", { name: "Add place" }).click();
  let dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await dialog.getByLabel("Restaurant name").fill("Draft Place");
  await dialog.locator("#cancelRestaurantButton").click();
  await page.getByRole("button", { name: "Add place" }).click();
  dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await expect(dialog.getByText("Draft restored")).toBeVisible();
  await expect(dialog.getByLabel("Restaurant name")).toHaveValue("Draft Place");
  await dialog.getByRole("button", { name: "Discard draft" }).click();
  await expect(dialog.getByLabel("Restaurant name")).toHaveValue("");
});

test("warns about duplicate dishes and supports Save & add another", async ({ page }) => {
  await page.locator(".restaurant-row").filter({ hasText: "Silkroad" }).click();
  await page.getByRole("button", { name: "Add dish" }).click();
  const dialog = page.getByRole("dialog", { name: "Add dish" });
  await dialog.getByLabel("Dish name").fill("Wide fried noodles");
  await expect(dialog.getByText("This dish may already be listed")).toBeVisible();
  await dialog.getByRole("button", { name: "Save & add another" }).click();
  await expect(dialog.locator("#dishErrorSummary")).toContainText("Review the similar dish");
  await dialog.getByLabel("I checked — save this as a separate dish.").check();
  await dialog.getByRole("button", { name: "Save & add another" }).click();
  await expect(dialog.getByText("Dish saved. Add another")).toBeVisible();
  await expect(dialog.getByLabel("Dish name")).toHaveValue("");
});

test("keeps camera, library, and half-star dish controls available", async ({ page }) => {
  await page.locator(".restaurant-row").filter({ hasText: "Silkroad" }).click();
  await page.getByRole("button", { name: "Add dish" }).click();
  const dialog = page.getByRole("dialog", { name: "Add dish" });
  await expect(dialog.getByRole("button", { name: "Take photo" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Choose photo" })).toBeVisible();
  await dialog.getByRole("button", { name: "Increase dish rating by half a star" }).click();
  await dialog.getByRole("button", { name: "Increase dish rating by half a star" }).click();
  await expect(dialog.locator("#dishRatingReadout")).toHaveText("1 / 5");
  await dialog.getByRole("button", { name: "Decrease dish rating by half a star" }).click();
  await expect(dialog.locator("#dishRatingReadout")).toHaveText("0.5 / 5");
});

test("adds, edits, trashes, and restores a focused restaurant rating", async ({ page }) => {
  const firstRow = page.locator(".restaurant-row").first();
  const restaurantName = await firstRow.locator("h3").innerText();
  await firstRow.click();

  await page.getByRole("button", { name: "Add your rating" }).click();
  let ratingDialog = page.getByRole("dialog", { name: "Add your rating" });
  await ratingDialog.getByRole("button", { name: "Save my rating" }).click();
  await expect(ratingDialog.getByText("Choose a rating", { exact: true })).toBeVisible();
  await ratingDialog.getByRole("slider", { name: "Your restaurant rating" }).focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(ratingDialog.locator("#restaurantRatingReadout")).toHaveText("1.5 / 5");

  const targetSizes = await ratingDialog.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().height)
  );
  expect(targetSizes.every((height) => height >= 44)).toBe(true);
  await ratingDialog.getByRole("button", { name: "Save my rating" }).click();
  await expect(page.getByRole("button", { name: "Edit your rating" })).toBeVisible();

  await page.getByRole("button", { name: "Edit your rating" }).click();
  ratingDialog = page.getByRole("dialog", { name: "Edit your rating" });
  await ratingDialog.getByRole("button", { name: "Increase restaurant rating by half a star" }).click();
  await ratingDialog.getByRole("button", { name: "Save my rating" }).click();
  await expect(page.locator(".rating-row--mine")).toContainText("2");

  await page.getByRole("button", { name: "Edit your rating" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Move my rating to Trash" }).click();
  await expect(page.getByRole("button", { name: "Add your rating" })).toBeVisible();

  await page.getByRole("button", { name: "Open Trash" }).click();
  const trashItem = page.locator(".trash-item").filter({ hasText: restaurantName });
  await expect(trashItem).toBeVisible();
  await trashItem.getByRole("button", { name: "Restore" }).click();
  await page.getByRole("button", { name: "Close Trash" }).click();
  await expect(page.getByRole("button", { name: "Edit your rating" })).toBeVisible();
});

test("restores a dish-review draft, shows the current review first, and keeps Trash recovery", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("plate-log-data-v1", JSON.stringify([{
      id: "draft-review-restaurant",
      name: "Draft Review Table",
      location: "Maadi",
      cuisine: "Asian",
      price: "$$",
      ratings: [],
      maps: "",
      notes: "",
      visited: [],
      playlists: [],
      updatedAt: Date.now(),
      photos: [],
      dishes: [{
        id: "draft-review-dish",
        name: "Crisp noodles",
        likedBy: [],
        photo: "",
        photoPath: "",
        ratings: [{
          email: "friend@example.com",
          name: "Friend",
          rating: 5,
          notes: "Older friend review",
          updatedAt: Date.now() - 60_000
        }]
      }]
    }]));
  });
  await page.reload();
  await page.locator(".restaurant-row").first().click();
  const dish = page.locator('.dish-card[data-dish-id="draft-review-dish"]');
  await dish.getByRole("button", { name: "Add your review" }).click();
  let reviewDialog = page.getByRole("dialog", { name: "Add your review" });
  await reviewDialog.getByRole("button", { name: "Increase review rating by half a star" }).click();
  await reviewDialog.getByRole("button", { name: "Increase review rating by half a star" }).click();
  await reviewDialog.getByLabel("Your review (optional)").fill("Keep this unsaved draft");
  await expect(reviewDialog.getByText("Draft saved in this tab")).toBeVisible();
  await reviewDialog.getByRole("button", { name: "Close", exact: true }).click();

  await dish.getByRole("button", { name: "Add your review" }).click();
  reviewDialog = page.getByRole("dialog", { name: "Add your review" });
  await expect(reviewDialog.getByText("Draft restored from this tab")).toBeVisible();
  await expect(reviewDialog.locator("#dishReviewRatingReadout")).toHaveText("1 / 5");
  await expect(reviewDialog.getByLabel("Your review (optional)")).toHaveValue("Keep this unsaved draft");
  await reviewDialog.getByRole("button", { name: "Discard draft" }).click();
  await expect(reviewDialog.locator("#dishReviewRatingReadout")).toHaveText("No rating");
  await expect(reviewDialog.getByLabel("Your review (optional)")).toHaveValue("");

  for (let step = 0; step < 8; step += 1) {
    await reviewDialog.getByRole("button", { name: "Increase review rating by half a star" }).click();
  }
  await reviewDialog.getByLabel("Your review (optional)").fill("Fresh current review");
  await reviewDialog.getByRole("button", { name: "Save my review" }).click();
  await expect(dish.locator(".dish-rating-preview-row").first()).toContainText("you");
  await expect(dish.locator(".dish-rating-preview-row").first().locator("time")).toContainText("Updated");

  await dish.getByRole("button", { name: "Edit your review" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Move my review to Trash" }).click();
  await expect(dish.getByRole("button", { name: "Add your review" })).toBeVisible();
  await page.getByRole("button", { name: "Open Trash" }).click();
  const trashItem = page.locator(".trash-item").filter({ hasText: "Crisp noodles" });
  await expect(trashItem).toBeVisible();
  await trashItem.getByRole("button", { name: "Restore" }).click();
  await page.getByRole("button", { name: "Close Trash" }).click();
  await expect(dish.getByRole("button", { name: "Edit your review" })).toBeVisible();
});

test("keeps separate ratings and reviews from multiple people on one dish", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("plate-log-data-v1", JSON.stringify([{
      id: "shared-review-restaurant",
      name: "Shared Table",
      location: "Maadi",
      cuisine: "Asian",
      price: "$$",
      ratings: [],
      maps: "",
      notes: "",
      visited: [],
      playlists: [],
      updatedAt: Date.now(),
      photos: [],
      dishes: [{
        id: "shared-review-dish",
        name: "Chili noodles",
        likedBy: ["Dany", "Mina"],
        photo: "",
        photoPath: "",
        ratings: [
          { email: "dany@example.com", name: "Dany", rating: 5, notes: "Deep chili flavor.", updatedAt: Date.now() - 2 },
          { email: "mina@example.com", name: "Mina", rating: 4, notes: "Great texture.", updatedAt: Date.now() - 1 }
        ]
      }]
    }]));
  });
  await page.reload();

  await page.locator(".restaurant-row").first().click();
  const dish = page.locator('.dish-card[data-dish-id="shared-review-dish"]');
  await expect(dish).toContainText("4.5 / 5");
  await expect(dish).toContainText("2 reviews");
  await dish.getByRole("button", { name: "Add your review" }).click();

  let reviewDialog = page.getByRole("dialog", { name: "Add your review" });
  await expect(reviewDialog.getByText(/Posting as You/)).toBeVisible();
  const reviewTargetSizes = await reviewDialog.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }))
  );
  for (const target of reviewTargetSizes) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  await reviewDialog.getByRole("button", { name: "Save my review" }).click();
  await expect(reviewDialog.getByText("Choose a rating", { exact: true })).toBeVisible();
  for (let step = 0; step < 6; step += 1) {
    await reviewDialog.getByRole("button", { name: "Increase review rating by half a star" }).click();
  }
  const ratedReviewTargetSizes = await reviewDialog.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }))
  );
  for (const target of ratedReviewTargetSizes) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
  await reviewDialog.getByLabel("Your review (optional)").fill("Bright heat and a clean finish.");
  await reviewDialog.getByRole("button", { name: "Save my review" }).click();

  await expect(dish).toContainText("4 / 5");
  await expect(dish).toContainText("3 reviews");
  await expect(dish.getByRole("button", { name: "Edit your review" })).toBeVisible();
  await dish.getByRole("button", { name: "Read all 3 reviews" }).click();

  const reviewsSheet = page.getByRole("dialog", { name: "Dish reviews" });
  await expect(reviewsSheet.locator(".dish-rating-row")).toHaveCount(3);
  await expect(reviewsSheet).toContainText("Deep chili flavor.");
  await expect(reviewsSheet).toContainText("Great texture.");
  await expect(reviewsSheet).toContainText("Bright heat and a clean finish.");
  await reviewsSheet.getByRole("button", { name: "Edit your review" }).click();

  reviewDialog = page.getByRole("dialog", { name: "Edit your review" });
  await expect(reviewDialog.locator("#dishReviewRatingReadout")).toHaveText("3 / 5");
  await reviewDialog.getByRole("button", { name: "Decrease review rating by half a star" }).click();
  await reviewDialog.getByLabel("Your review (optional)").fill("Still good, but hotter than I remembered.");
  await reviewDialog.getByRole("button", { name: "Save my review" }).click();

  await expect(dish).toContainText("3.8 / 5");
  await expect(dish).toContainText("3 reviews");
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
  await expect(page.locator("#detailPanel .detail-hero img")).toHaveAttribute("src", newestPhoto);
  await expect(page.locator("#detailPanel .detail-hero")).toBeVisible();
  await page.locator('[data-action="set-cover-photo"][data-photo-id="photo-chosen"]').click();
  await expect(page.locator(".restaurant-photo-card.is-cover .photo-cover-badge")).toHaveText("Main photo");
  await expect(page.locator("#detailPanel .detail-hero img")).toHaveAttribute("src", chosenPhoto);

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

test("keeps the desktop restaurant detail aligned beside the list", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop split-view contract.");

  const layout = await page.evaluate(() => {
    const list = document.querySelector(".restaurant-list")?.getBoundingClientRect();
    const detail = document.querySelector("#detailPanel")?.getBoundingClientRect();
    const tip = document.querySelector("#listActionTip")?.getBoundingClientRect();
    return {
      listTop: list?.top,
      listRight: list?.right,
      detailTop: detail?.top,
      detailLeft: detail?.left,
      tipRight: tip?.right
    };
  });

  expect(Math.abs(layout.listTop - layout.detailTop)).toBeLessThanOrEqual(1);
  expect(layout.detailLeft).toBeGreaterThan(layout.listRight);
  expect(layout.tipRight).toBeLessThanOrEqual(layout.listRight);
  await expect(page.locator("#detailPanel .detail-hero")).toBeVisible();
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

test("explains stacked playlist filters and can reveal the full playlist", async ({ page }) => {
  await page.evaluate(() => {
    const restaurants = Array.from({ length: 19 }, (_, index) => ({
      id: `asian-${index}`,
      name: `Asian place ${index + 1}`,
      location: index % 2 ? "Maadi" : "Zamalek",
      cuisine: "Asian",
      price: "$$",
      ratings: index < 3
        ? [{ email: "fixture@example.com", name: "Fixture", rating: index === 2 ? 3.5 : 5 }]
        : [],
      maps: "",
      notes: index < 3 ? "featured" : "",
      visited: [],
      playlists: ["Asian"],
      updatedAt: Date.now() - index,
      photos: [],
      dishes: []
    }));
    localStorage.setItem("plate-log-data-v1", JSON.stringify(restaurants));
    localStorage.setItem("plate-log-filters-v1", JSON.stringify({
      search: "featured",
      location: "all",
      cuisine: "all",
      price: "all",
      rating: "0",
      playlist: "Asian",
      sort: "recent",
      view: "list"
    }));
  });
  await page.reload();

  await expect(page.locator(".restaurant-row")).toHaveCount(3);
  await expect(page.getByLabel("Search restaurants")).toHaveValue("featured");
  await expect(page.locator("#playlistFilterHint")).toHaveText("3 of 19 places");
  const showAll = page.getByRole("button", { name: "Clear search and filters to show all 19 places in Asian" });
  await expect(showAll).toBeVisible();
  const showAllBox = await showAll.boundingBox();
  expect(showAllBox?.height).toBeGreaterThanOrEqual(44);

  await showAll.click();
  await expect(page.locator(".restaurant-row")).toHaveCount(19);
  await expect(page.locator("#playlistFilterHint")).toHaveText("19 places");
  await expect(showAll).toBeHidden();
  await expect(page.locator("#ratingFilter")).toHaveValue("0");
  await expect(page.getByLabel("Search restaurants")).toHaveValue("");
  await expect(page.locator('[data-playlist="Asian"]')).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/playlist=Asian/);
  await expect(page).not.toHaveURL(/[?&](q|rating|visit|wantgo)=/);

  await page.getByLabel("Search restaurants").fill("featured");
  await page.waitForTimeout(220);
  await expect(page.locator(".restaurant-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByLabel("Search restaurants")).toHaveValue("");
  await expect(page.locator(".restaurant-row")).toHaveCount(19);
  await page.getByRole("button", { name: "Close filters" }).click();
});

test("marks visit status, filters Not visited vs Been, and shows removable filter chips", async ({ page }) => {
  await expect(page.locator(".restaurant-row").filter({ hasText: "Silkroad" }).locator(".visit-status--been")).toBeVisible();
  await expect(page.getByRole("button", { name: "List view" })).toHaveCount(0);

  await page.locator('#visitFilter [data-visit="want"]').click();
  await expect(page.locator(".restaurant-row")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove Not visited filter" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Not visited filter" }).click();
  await expect(page.locator(".restaurant-row")).toHaveCount(3);

  await page.getByLabel("Search restaurants").fill("Silkroad");
  await page.waitForTimeout(220);
  await expect(page.getByRole("button", { name: "Remove search Silkroad" })).toBeVisible();
  await page.getByRole("button", { name: "Remove search Silkroad" }).click();
  await expect(page.getByLabel("Search restaurants")).toHaveValue("");
  await expect(page.locator(".restaurant-row")).toHaveCount(3);

  await page.getByRole("button", { name: "Add place" }).click();
  const dialog = page.getByRole("dialog", { name: "Add restaurant" });
  await dialog.getByLabel("Restaurant name").fill("Untried Noodle Bar");
  await dialog.getByRole("button", { name: "Save place" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();

  const untried = page.locator(".restaurant-row").filter({ hasText: "Untried Noodle Bar" });
  await expect(untried.locator(".visit-status--want")).toBeVisible();
  await page.locator('#visitFilter [data-visit="want"]').click();
  await expect(page.locator(".restaurant-row")).toHaveCount(1);
  await untried.click();
  await page.getByRole("button", { name: "Mark as been" }).click();
  await expect(page.locator("#detailPanel").locator(".visit-status--been")).toBeVisible();
  const back = page.getByRole("button", { name: "Back to places" });
  if (await back.isVisible()) await back.click();
  await expect(page.locator(".restaurant-row").filter({ hasText: "Untried Noodle Bar" }).locator(".visit-status--been")).toBeVisible();
});

test("filters the personal My list bookmarks", async ({ page }) => {
  const wantGoChip = page.getByRole("button", { name: "Show only places on my list" });
  await expect(wantGoChip).toBeVisible();

  const silkroad = page.locator(".restaurant-row").filter({ hasText: "Silkroad" });
  await silkroad.locator('[data-action="toggle-want"]').click();
  await expect(silkroad.locator(".want-to-go-mark")).toBeVisible();

  await wantGoChip.click();
  await expect(page.locator(".restaurant-row")).toHaveCount(1);
  await expect(silkroad).toBeVisible();
  await expect(page).toHaveURL(/wantgo=1/);
  await expect(page.getByRole("button", { name: "Remove My list filter" })).toBeVisible();

  await page.locator('#visitFilter [data-visit="want"]').click();
  await expect(page.locator(".restaurant-row")).toHaveCount(0);

  await page.locator('#visitFilter [data-visit="all"]').click();
  await expect(page.locator(".restaurant-row")).toHaveCount(1);

  await page.getByRole("button", { name: "Remove My list filter" }).click();
  await expect(page.locator(".restaurant-row")).toHaveCount(3);
  await expect(page).not.toHaveURL(/wantgo=/);
});

test("has no critical automated accessibility violations on the places surface", async ({ page }) => {
  await expect(page.locator("#ownerReleaseBar")).toBeHidden();
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

test("keeps a long restaurant queue rendered in the mobile page flow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile rendering contract.");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => {
    const restaurants = Array.from({ length: 29 }, (_, index) => ({
      id: `mobile-queue-${index}`,
      name: `Mobile place ${String(index + 1).padStart(2, "0")}`,
      location: `Area ${index % 5}`,
      cuisine: ["Egyptian", "Chinese", "Italian"][index % 3],
      price: ["$", "$$", "$$$"][index % 3],
      ratings: [],
      maps: "",
      notes: "",
      visited: [],
      playlists: index % 2 ? ["Try next"] : [],
      updatedAt: Date.now() - index,
      photos: [],
      dishes: []
    }));
    localStorage.setItem("plate-log-data-v1", JSON.stringify(restaurants));
  });
  await page.reload();

  const rows = page.locator(".restaurant-row");
  await expect(rows).toHaveCount(29);
  await expect(rows.first()).toBeVisible();
  const queueContract = await page.locator(".restaurant-list").evaluate((list) => {
    const restaurantRows = Array.from(list.querySelectorAll(".restaurant-row"));
    return {
      contentVisibility: restaurantRows.map((row) => getComputedStyle(row).contentVisibility),
      rowHeights: restaurantRows.map((row) => Math.round(row.getBoundingClientRect().height)),
      listHeight: Math.round(list.getBoundingClientRect().height),
      isInnerScroller: list.scrollHeight > list.clientHeight
    };
  });
  expect(new Set(queueContract.contentVisibility)).toEqual(new Set(["visible"]));
  expect(queueContract.rowHeights.every((height) => height >= 104)).toBe(true);
  expect(queueContract.listHeight).toBeGreaterThan(29 * 104);
  expect(queueContract.isInnerScroller).toBe(false);
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
