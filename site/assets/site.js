'use strict';
(() => {
  const head = document.getElementById('siteHead');
  const menu = document.getElementById('menuToggle');
  const setHead = () => head.classList.toggle('scrolled', window.scrollY > 8);
  setHead();
  window.addEventListener('scroll', setHead, { passive: true });
  menu?.addEventListener('click', () => {
    const open = head.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  document.querySelectorAll('.nav a').forEach(link => link.addEventListener('click', () => {
    head.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }));

  // The preview uses the same interaction language as the island: one tab at a
  // time, visible labels on hover, and no hidden second section.
  const tabs = [...document.querySelectorAll('.island-nav [data-tab]')];
  const panels = [...document.querySelectorAll('.demo-panel')];
  const selectTab = name => {
    tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      selectTab(tabs[next].dataset.tab);
    });
  });

  const island = document.getElementById('islandDemo');
  const collapse = () => {
    island?.classList.toggle('is-collapsed');
    const button = document.getElementById('demoCollapseText');
    if (button) button.textContent = island?.classList.contains('is-collapsed') ? 'Open preview' : 'Collapse preview';
  };
  document.getElementById('demoCollapse')?.addEventListener('click', collapse);
  document.getElementById('demoCollapseText')?.addEventListener('click', collapse);

  let seconds = 25 * 60;
  let timer = null;
  const timerEl = document.getElementById('focusTimer');
  const toggle = document.getElementById('focusToggle');
  const paint = () => {
    if (!timerEl) return;
    timerEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  document.getElementById('focusToggle')?.addEventListener('click', () => {
    if (timer) {
      clearInterval(timer); timer = null; toggle.textContent = 'Resume';
    } else {
      timer = setInterval(() => {
        seconds = Math.max(0, seconds - 1);
        paint();
        if (!seconds) { clearInterval(timer); timer = null; toggle.textContent = 'Start again'; }
      }, 1000);
      toggle.textContent = 'Pause';
    }
  });
  document.getElementById('focusReset')?.addEventListener('click', () => {
    clearInterval(timer); timer = null; seconds = 25 * 60; paint(); toggle.textContent = 'Start';
  });
  paint();

  let glasses = 3;
  const waterCount = document.getElementById('waterCount');
  const glassesEl = document.getElementById('waterGlasses');
  const paintWater = () => {
    if (waterCount) waterCount.textContent = `${glasses} / 8`;
    if (glassesEl) [...glassesEl.children].forEach((el, index) => el.classList.toggle('full', index < glasses));
  };
  document.getElementById('waterAdd')?.addEventListener('click', () => {
    glasses = glasses >= 8 ? 1 : glasses + 1;
    paintWater();
  });

  // Read the live release channel when the browser allows it. The static page
  // remains correct if GitHub is unreachable or CORS is denied.
  const repo = 'shravan-kumar-nalacharla/agent-notch-releases';
  const api = `https://api.github.com/repos/${repo}/releases/latest`;
  const formatBytes = value => {
    const bytes = Number(value);
    return Number.isFinite(bytes) && bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—';
  };
  async function releaseInfo() {
    try {
      const response = await fetch(api, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) return;
      const release = await response.json();
      const version = String(release.tag_name || '').replace(/^v/, '');
      if (version) {
        const el = document.getElementById('latestVersion');
        if (el) el.textContent = version;
      }
      const asset = (release.assets || []).find(item => item.name === 'Agent-Notch-Setup.exe')
        || (release.assets || []).find(item => /^Agent-Notch-Setup-\d+\.\d+\.\d+\.exe$/.test(item.name));
      const sizeEl = document.getElementById('installerSize');
      if (sizeEl && asset) sizeEl.textContent = formatBytes(asset.size);
      const hashEl = document.getElementById('installerHash');
      if (hashEl) {
        const digest = String(asset?.digest || '');
        hashEl.textContent = digest.startsWith('sha256:')
          ? `${digest.slice(7, 23)}…${digest.slice(-12)}`
          : 'Open the release checksums';
      }
      const download = document.getElementById('downloadCurrent');
      if (download && asset?.browser_download_url) download.href = asset.browser_download_url;
    } catch {}
  }
  releaseInfo();
})();
