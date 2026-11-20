export const phoneChoiceLayout = window.matchMedia("(max-width: 680px)");

export function createCaptureChoiceSheet(dialog) {
  const heading = dialog.querySelector("h2");
  const content = dialog.querySelector(".capture-choice-content");
  const dismiss = dialog.querySelector("#closeCaptureChoiceSheet");
  const done = dialog.querySelector("#finishCaptureChoiceSheet");
  let current = null;
  let frame = 0;

  function fitViewport() {
    if (!current || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!current) return;
      // The keyboard can shrink and offset just the visible viewport.
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      dialog.style.setProperty("--choice-viewport-height", `${height}px`);
      dialog.style.setProperty("--choice-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      dialog.toggleAttribute("data-short-viewport", height < 500);
    });
  }

  function close() {
    if (!current) return;
    const { trigger, node, marker, listeners } = current;
    current = null;
    listeners.abort();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (dialog.open) dialog.close();
    if (marker) marker.replaceWith(node);
    else node.remove();
    trigger.setAttribute("aria-expanded", "false");
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function open({ title, trigger, node, multiple = false }) {
    close();
    // Reattach the existing playlist editor with its selections and listeners.
    const marker = node.isConnected ? document.createComment("") : null;
    if (marker) node.before(marker);
    const listeners = new AbortController();
    current = { trigger, node, marker, listeners };
    heading.textContent = title;
    dismiss.hidden = multiple;
    done.hidden = !multiple;
    content.replaceChildren(node);
    trigger.setAttribute("aria-expanded", "true");
    dialog.showModal();
    (multiple ? done : dismiss).focus({ preventScroll: true });
    const { signal } = listeners;
    window.visualViewport?.addEventListener("resize", fitViewport, { signal });
    window.visualViewport?.addEventListener("scroll", fitViewport, { signal });
    window.addEventListener("resize", fitViewport, { signal });
    phoneChoiceLayout.addEventListener("change", close, { signal });
    trigger.closest("dialog")?.addEventListener("close", close, { signal });
    fitViewport();
  }

  dismiss.addEventListener("click", close);
  done.addEventListener("click", close);
  dialog.addEventListener("keydown", event => {
    if (event.isComposing || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => { if (!dialog.open) close(); });
  return { open, close };
}
