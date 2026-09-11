// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { allowsPagePinchZoom, bindPageZoomLock } from "../lib/page-zoom.js";

describe("page zoom lock", () => {
  it("allows pinch only on the photo gallery and the map", () => {
    document.body.innerHTML = `
      <main>
        <p class="copy">Places</p>
        <div class="gallery-viewport"><img alt="" /></div>
        <div class="leaflet-container"><div class="leaflet-pane"></div></div>
      </main>
    `;
    expect(allowsPagePinchZoom(document.querySelector(".copy"))).toBe(false);
    expect(allowsPagePinchZoom(document.querySelector(".gallery-viewport img"))).toBe(true);
    expect(allowsPagePinchZoom(document.querySelector(".leaflet-pane"))).toBe(true);
  });

  it("blocks two-finger page pinch and leaves gallery pinch cancelable", () => {
    document.body.innerHTML = `
      <main>
        <p class="copy">Places</p>
        <div class="gallery-viewport"><img alt="" /></div>
      </main>
    `;
    bindPageZoomLock();
    const pagePinch = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperty(pagePinch, "touches", { value: [{}, {}] });
    expect(document.querySelector(".copy").dispatchEvent(pagePinch)).toBe(false);

    const galleryPinch = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperty(galleryPinch, "touches", { value: [{}, {}] });
    expect(document.querySelector(".gallery-viewport img").dispatchEvent(galleryPinch)).toBe(true);
  });

  it("blocks ctrl/trackpad wheel zoom on the page and on photos", () => {
    document.body.innerHTML = `
      <main>
        <p class="copy">Places</p>
        <div class="gallery-viewport"><img alt="" /></div>
      </main>
    `;
    bindPageZoomLock();
    const pageWheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -20 });
    expect(document.querySelector(".copy").dispatchEvent(pageWheel)).toBe(false);
    const galleryWheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -20 });
    expect(document.querySelector(".gallery-viewport img").dispatchEvent(galleryWheel)).toBe(false);
    const scroll = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 20 });
    expect(document.querySelector(".copy").dispatchEvent(scroll)).toBe(true);
  });
});
