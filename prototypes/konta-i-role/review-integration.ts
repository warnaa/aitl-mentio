/** Local integration of the supplied engine. Its source and operation log stay untouched. */
export function installReviewHints(): () => void {
  const panel = document.getElementById('prototype-review-panel');
  if (!panel) return () => {};
  let opener: HTMLElement | null = null;
  const restore = () => requestAnimationFrame(() => {
    if (!panel.classList.contains('open')) opener?.focus();
  });
  function click(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>('button');
    if (button && !panel!.contains(button)) opener = button;
    if (button && panel!.contains(button) && button.textContent === 'Close') restore();
  }
  function key(event: KeyboardEvent) {
    // The supplied engine selects threads only by mouse click on a div; mirror it for Enter/Space.
    const head = event.target instanceof HTMLElement && event.target.matches('.anno-thread-head[role=button]') ? event.target : null;
    if (head && (event.key === 'Enter' || event.key === ' ')) {
      // Same result as a mouse click: the engine then moves focus into the thread's reply box.
      event.preventDefault(); event.stopPropagation();
      head.click();
      return;
    }
    if (event.key === 'Escape' && panel!.classList.contains('open')) restore();
    if (event.key === 'Enter' && event.altKey && document.body.classList.contains('proto-comment') && event.target instanceof HTMLElement && event.target.closest('.frame')) {
      event.preventDefault(); event.stopPropagation();
      opener = event.target;
      event.target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    }
  }
  function update() {
    panel!.querySelectorAll<HTMLElement>('.anno-thread-head').forEach(head => {
      const active = String(head.closest('.anno-thread')?.classList.contains('active'));
      // Name comes from the visible number, anchor and badges (WCAG 2.5.3). Guarded writes stay idempotent.
      if (head.getAttribute('role') !== 'button') { head.setAttribute('role','button'); head.tabIndex = 0; }
      if (head.getAttribute('aria-pressed') !== active) head.setAttribute('aria-pressed',active);
    });
    panel!.querySelectorAll<HTMLElement>('.anno-composer').forEach((composer, index) => {
      const input = composer.querySelector('textarea');
      const submit = [...composer.querySelectorAll('button')].find(button => ['Add comment','Reply'].includes(button.textContent ?? ''));
      if (!input || !submit) return;
      let hint = composer.querySelector<HTMLElement>('[data-empty-review-hint]');
      if (!hint) {
        hint = document.createElement('p');
        hint.dataset.emptyReviewHint = '';
        hint.id = `prototype-review-hint-${index}`;
        hint.className = 'mentio-field-description';
        composer.append(hint);
      }
      const empty = !input.value.trim();
      submit.disabled = empty;
      submit.setAttribute('aria-describedby',hint.id);
      const text = empty ? 'Wpisz treść komentarza lub odpowiedzi, aby ją dodać.' : 'Możesz też użyć Ctrl+Enter lub Cmd+Enter.';
      if (hint.textContent !== text) hint.textContent = text;
    });
  }
  const observer = new MutationObserver(update);
  observer.observe(panel, {childList:true,subtree:true});
  panel.addEventListener('input',update);
  document.addEventListener('click',click,true);
  document.addEventListener('keydown',key,true);
  update();
  return () => { observer.disconnect(); panel.removeEventListener('input',update); document.removeEventListener('click',click,true); document.removeEventListener('keydown',key,true); };
}
