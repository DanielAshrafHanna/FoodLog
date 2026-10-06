export async function expandRestaurantExtras(form) {
  for (const label of ['Price', 'Playlist', 'Photos', 'Note']) {
    const button = form.getByRole('button', {name:`+ ${label}`, exact:true});
    if (await button.getAttribute('aria-expanded') === 'false') await button.click();
  }
}
export async function editCaptureLookup(form, key) {
  const trigger = form.locator(`#${key}CaptureButton`);
  if (await trigger.isVisible()) await trigger.click();
}
