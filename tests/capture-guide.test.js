// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createCaptureGuide } from "../lib/capture-guide.js";

function mountGuide({ showNext = true } = {}) {
  document.body.innerHTML = `
    <form id="form">
      <div class="capture-header"></div>
      <div class="capture-scroll" id="body">
        <label id="name-field">Name<input id="name" required /></label>
        <div id="details-field">Details field</div>
        <div id="memories-field">Memories field</div>
      </div>
      <div class="capture-actions">
        <button type="submit" id="save">Save</button>
      </div>
    </form>
  `;
  const form = document.querySelector("#form");
  const guide = createCaptureGuide({
    form,
    body: document.querySelector("#body"),
    save: document.querySelector("#save"),
    showNext,
    steps: [
      { label: "Place", title: "The place", description: "Name first.", nodes: [document.querySelector("#name-field")] },
      { label: "Details", title: "The details", description: "Optional.", nextLabel: "Add memories", nodes: [document.querySelector("#details-field")] },
      { label: "Memories", title: "Your memories", description: "Photos.", nodes: [document.querySelector("#memories-field")] }
    ]
  });
  return { form, guide };
}

describe("createCaptureGuide", () => {
  it("lets tabs and Continue open a later step without a name", () => {
    const { form } = mountGuide();
    const detailsTab = form.querySelector('.capture-progress button:nth-child(2)');
    const memoriesTab = form.querySelector('.capture-progress button:nth-child(3)');
    const next = form.querySelector(".guide-next");

    detailsTab.click();
    expect(detailsTab.getAttribute("aria-current")).toBe("step");
    expect(form.querySelector('[data-capture-step="1"]').hidden).toBe(false);
    expect(form.querySelector("#details-field").isConnected).toBe(true);

    memoriesTab.click();
    expect(memoriesTab.getAttribute("aria-current")).toBe("step");
    expect(form.querySelector('[data-capture-step="2"]').hidden).toBe(false);

    form.querySelector('.capture-progress button:nth-child(1)').click();
    next.click();
    expect(detailsTab.getAttribute("aria-current")).toBe("step");
  });

  it("keeps Save as the form submitter so required name still blocks save", () => {
    mountGuide({ showNext: false });
    const name = document.querySelector("#name");
    expect(name.required).toBe(true);
    expect(document.querySelector("#save").type).toBe("submit");
    expect(name.validity.valid).toBe(false);
    name.value = "Cafe Roma";
    expect(name.validity.valid).toBe(true);
  });
});
