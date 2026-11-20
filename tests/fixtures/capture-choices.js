import { expect } from "@playwright/test";

export function hasPhoneChoices(page) {
  return page.viewportSize().width <= 680;
}

export async function useAnchoredChoices(page) {
  if (!hasPhoneChoices(page)) return;
  await page.setViewportSize({ ...page.viewportSize(), width: 720 });
}

export async function chooseLookup(page, input, value, { create = false } = {}) {
  const id = await input.getAttribute("id");
  if (hasPhoneChoices(page)) {
    const trigger = page.locator(`[data-lookup-for="${id}"]`);
    await trigger.click();
    const sheet = page.locator("#captureChoiceSheet");
    await sheet.getByRole("searchbox").fill(value);
    if (create) {
      await sheet.getByRole("button", { name: `Add “${value}”`, exact: true }).click();
      await sheet.getByRole("button", { name: /^Create new/ }).click();
    } else {
      await sheet.locator("[data-choice]").filter({ hasText: value }).first().click();
    }
    await expect(sheet).toBeHidden();
    return;
  }
  await input.fill(value);
  const list = page.locator(`#${await input.getAttribute("aria-controls")}`);
  if (create) {
    await list.getByRole("option", { name: new RegExp(`Add “${value}”`) }).click();
    const feedback = page.locator(`#${(await input.getAttribute("aria-describedby")).split(" ").at(-1)}`);
    await feedback.getByRole("button", { name: /^Create new/ }).click();
  } else {
    await list.locator("[data-lookup-value]").filter({ hasText: value }).first().click();
  }
}

export async function openPlaylists(page) {
  if (hasPhoneChoices(page)) await page.locator("#openRestaurantPlaylists").click();
  return page.locator("#playlistPicker");
}

export async function closePlaylists(page) {
  if (hasPhoneChoices(page)) await page.locator("#finishCaptureChoiceSheet").click();
}
