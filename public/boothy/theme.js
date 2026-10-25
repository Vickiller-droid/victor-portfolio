(function () {
  'use strict';
  const key = 'boothy-theme';
  const system = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { const saved = localStorage.getItem(key); if (['dark', 'light'].includes(saved)) preference = saved; } catch {}
  function apply() {
    const theme = preference === 'system' ? (system?.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111c19' : '#f5f0e8');
    document.querySelectorAll('[data-theme-choice]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.themeChoice === preference)));
    window.dispatchEvent(new Event('boothytheme'));
  }
  window.BoothyTheme = {
    sync: apply, preference: () => preference,
    set(value) { if (!['light', 'dark', 'system'].includes(value)) return; preference = value; try { localStorage.setItem(key, value); } catch {} apply(); },
    toggle() { this.set(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); }
  };
  system?.addEventListener?.('change', () => { if (preference === 'system') apply(); });
  apply();
})();
