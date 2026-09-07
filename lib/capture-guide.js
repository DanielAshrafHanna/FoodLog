// Reuses the existing form controls and save handlers; only one step is exposed.
export function createCaptureGuide({ form, body, steps, save, validate }) {
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
    button.textContent = step.label;
    button.addEventListener('click', () => go(i));
    nav.append(button);
    return panel;
  });
  body.prepend(heading);
  form.querySelector('.capture-header').after(nav);
  const actions = save.parentElement;
  const back = document.createElement('button');
  back.type = 'button'; back.className = 'secondary-action guide-back'; back.textContent = 'Back';
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'primary-action guide-next'; next.textContent = 'Continue';
  actions.prepend(back); actions.append(next);
  back.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
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
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    save.classList.toggle('primary-action', next.hidden);
    save.classList.toggle('secondary-action', !next.hidden);
    form.dataset.guideStep = String(current);
    body.scrollTop = 0;
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
