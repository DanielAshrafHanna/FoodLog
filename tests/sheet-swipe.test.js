import { describe, expect, it } from "vitest";
import { sheetSwipeShouldDismiss, springStep } from "../lib/sheet-swipe.js";

describe("sheet swipe physics and thresholds", () => {
  it("commits dismissal past the distance threshold or on a fast downward flick", () => {
    expect(sheetSwipeShouldDismiss(110, 0, 400)).toBe(true);
    expect(sheetSwipeShouldDismiss(40, 720, 400)).toBe(true);
    expect(sheetSwipeShouldDismiss(24, 900, 400)).toBe(false);
    expect(sheetSwipeShouldDismiss(50, 100, 400)).toBe(false);
  });

  it("rejects dismissal when the user reverses direction upward", () => {
    expect(sheetSwipeShouldDismiss(160, -320, 400)).toBe(false);
    expect(sheetSwipeShouldDismiss(95, -260, 320)).toBe(false);
  });

  it("converges smoothly toward the target without oscillation", () => {
    const start = springStep(120, 0, 0, 0);
    const mid = springStep(120, 0, 0, 0.11);
    const end = springStep(120, 0, 0, 0.6);
    expect(start.position).toBeCloseTo(120, 5);
    expect(mid.position).toBeGreaterThan(0);
    expect(mid.position).toBeLessThan(120);
    expect(Math.abs(end.position)).toBeLessThan(0.5);
  });
});
