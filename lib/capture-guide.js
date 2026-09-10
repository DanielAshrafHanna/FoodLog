// Reuses the existing form controls and save handlers; only one step is exposed.
export function createCaptureGuide({ form, body, steps, save, validate, onStepChange, showNext = true }) {
  let current = 0;
  const nav = document.createElement('nav');
  nav.className = 'capture-progress';
  nav.setAttribute('aria-label', 'Logging steps');
  const heading = document.createElement('div');
  heading.className = 'capture-prompt';
  const title = document.createElement('h3');
  title.tabIndex = -1;
  const subtitle = document.createElement('p');
  heading.append(title, subtitle);
  const panels = steps.map((step, i) => {
    const panel = document.createElement('section');
    panel.className = 'capture-page';
    panel.dataset.captureStep = i;
    for (const node of step.nodes.filter(Boolean)) panel.append(node);
    body.append(panel);
    const button = document.createElement('button');
    button.type = 'button';
    const index = document.createElement('span');
    index.className = 'capture-progress-index';
    index.setAttribute('aria-hidden', 'true');
    index.textContent = String(i + 1);
    const label = document.createElement('span');
    label.className = 'capture-progress-label';
    label.textContent = step.label;
    button.append(index, label);
    button.addEventListener('click', () => go(i));
    nav.append(button);
    return panel;
  });
  body.prepend(heading);
  form.querySelector('.capture-header').after(nav);
  let next = null;
  if (showNext) {
    next = document.createElement('button');
    next.type = 'button';
    next.className = 'secondary-action guide-next';
    next.textContent = 'Continue';
    save.parentElement.append(next);
    next.addEventListener('click', () => go(current + 1));
  }
  function go(index, focus = true) {
    index = Math.max(0, Math.min(steps.length - 1, index));
    if (index > current && validate && !validate()) return;
    current = index;
    panels.forEach((panel, i) => { panel.hidden = i !== current; });
    [...nav.children].forEach((button, i) => {
      if (i === current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    title.textContent = steps[current].title;
    subtitle.textContent = steps[current].description;
    const first = current === 0;
    const last = current === steps.length - 1;
    if (next) {
      next.hidden = last;
      next.textContent = steps[current].nextLabel || 'Continue';
      next.classList.toggle('primary-action', !first && !last);
      next.classList.toggle('secondary-action', first || last);
    }
    const saveIsPrimary = !next || first || last;
    save.classList.toggle('primary-action', saveIsPrimary);
    save.classList.toggle('secondary-action', !saveIsPrimary);
    form.dataset.guideStep = String(current);
    body.scrollTop = 0;
    onStepChange?.({ index: current, first, last, save, next });
    if (focus) title.focus({ preventScroll: true });
  }
  return {
    reset() { nav.hidden = false; heading.hidden = false; go(0, false); },
    showField(node) {
      const i = panels.findIndex(panel => panel.contains(node));
      if (i >= 0) go(i);
      const disclosure = node.closest('details');
      if (disclosure) disclosure.open = true;
    },
    finish() { nav.hidden = true; },
    go
  };
}
