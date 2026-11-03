'use strict';

(() => {
  const api = window.island;
  const $ = id => document.getElementById(id);
  let loading = false;
  let lastLoad = 0;

  async function value(promise) {
    const response = await promise;
    if (!response.ok) throw new Error(response.error);
    return response.value;
  }

  function localDay(now = Date.now()) {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function systemMetrics(system) {
    if (!system) return;
    const cells = $('homeMetrics')?.querySelectorAll('span b');
    if (!cells) return;
    cells[0].textContent = `${Math.round(system.cpu)}%`;
    cells[1].textContent = system.gpu < 0 ? '--' : `${system.gpu}%`;
    cells[2].textContent = `${system.ram}%`;
    cells[3].textContent = system.battery < 0 ? 'AC' : `${system.battery}%`;
  }

  function paintMedia(media) {
    const icon = $('homeLiveIcon');
    const title = $('homeNow');
    const meta = $('homeNowMeta');
    if (!title || !meta || !icon) return;
    if (!media?.available) {
      icon.style.backgroundImage = '';
      title.textContent = 'Nothing playing';
      meta.textContent = 'Your day is quiet';
      return;
    }
    icon.style.backgroundImage = media.cover ? `url("${media.cover}")` : '';
    icon.style.backgroundSize = 'cover';
    icon.style.backgroundPosition = 'center';
    title.textContent = media.title || 'Now playing';
    meta.textContent = media.playing ? (media.artist || 'Playing') : `Paused / ${media.artist || 'Media'}`;
  }

  function paintLine(library, weather, calendar) {
    const line = $('homeLine');
    if (!line) return;
    const today = localDay();
    const remaining = library?.todos?.filter(item => item.date === today && !item.done).length || 0;
    const pending = library?.reminders?.filter(item => !item.fired).length || 0;
    const nextCalendar = calendar?.[0];
    const pieces = [];
    if (remaining) pieces.push(`${remaining} task${remaining === 1 ? '' : 's'} left today`);
    if (pending) pieces.push(`${pending} reminder${pending === 1 ? '' : 's'} queued`);
    if (nextCalendar) pieces.push(`Next: ${nextCalendar.title}`);
    if (weather) pieces.push(`${Math.round(weather.current.temperature_2m)} C in ${weather.city}`);
    line.textContent = pieces.join(' / ') || 'Tasks, reminders and what is playing will appear here.';
  }

  function surfaceVisible() {
    return !document.body.classList.contains('settings-window') &&
      document.body.classList.contains('expanded') &&
      document.body.classList.contains('view-home') &&
      !$('home')?.hidden;
  }

  async function refresh(force = false) {
    if (loading || !surfaceVisible()) return;
    if (!force && Date.now() - lastLoad < 2500) return;
    loading = true;
    lastLoad = Date.now();
    try {
      const [library, media, weather, calendar] = await Promise.all([
        value(api.library()).catch(() => null),
        value(api.desktop('media')).catch(() => null),
        value(api.desktop('weather')).catch(() => null),
        value(api.desktop('calendar')).catch(() => [])
      ]);
      paintMedia(media);
      paintLine(library, weather, calendar);
      if (!window.islandSystem) {
        try {
          window.islandSystem = await value(api.desktop('system'));
        } catch {}
      }
      systemMetrics(window.islandSystem);
    } finally {
      loading = false;
    }
  }

  api.onSystem(system => {
    window.islandSystem = system;
    systemMetrics(system);
  });
  api.onLibrary(library => {
    window.islandLibrary = library;
    if (surfaceVisible()) paintLine(library, null, null);
  });

  $('homeLive').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('island:navigate', { detail: 'tools' }));
    const page = document.querySelector('[data-page=media]');
    if (page) page.click();
  });

  window.addEventListener('island:view', event => {
    if (event.detail === 'home') refresh(true);
  });
  window.addEventListener('island:expanded', () => refresh(true));
  setInterval(() => refresh(false), 6000);
  setTimeout(() => refresh(true), 900);
})();
