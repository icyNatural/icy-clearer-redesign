const root = document.querySelector<HTMLElement>('[data-natural-field]');

if (root) {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-signal-select]'));
  const clusters = Array.from(root.querySelectorAll<HTMLElement>('[data-signal-cluster]'));
  const valid = new Set(['ALL', ...clusters.map((cluster) => cluster.dataset.signalCluster || '')]);

  const activate = (requested: string, push = true) => {
    const signal = valid.has(requested) ? requested : 'ALL';
    root.dataset.activeSignal = signal;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.signalSelect === signal)));
    clusters.forEach((cluster) => {
      const active = signal === 'ALL' || cluster.dataset.signalCluster === signal;
      cluster.hidden = signal !== 'ALL' && !active;
      cluster.classList.toggle('is-active', signal !== 'ALL' && active);
    });
    if (push) {
      const url = new URL(location.href);
      if (signal === 'ALL') url.searchParams.delete('signal');
      else url.searchParams.set('signal', signal.toLowerCase());
      history.pushState({ naturalSignal: signal }, '', url);
    }
  };

  buttons.forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    activate(button.dataset.signalSelect || 'ALL');
  }));

  clusters.forEach((cluster) => cluster.addEventListener('click', (event) => {
    if (document.body.classList.contains('is-authoring')) return;
    const target = event.target as HTMLElement;
    if (target.closest('a,button,video,[data-author-id]')) return;
    activate(cluster.dataset.signalCluster || 'ALL');
  }));

  window.addEventListener('popstate', () => {
    const signal = new URL(location.href).searchParams.get('signal')?.toUpperCase() || 'ALL';
    activate(signal, false);
  });

  const initial = new URL(location.href).searchParams.get('signal')?.toUpperCase() || 'ALL';
  activate(initial, false);
}
