(function () {
  'use strict';
  // The Android bridge exists only in Boothy's bundled, trusted application page.
  const bridge = window.BoothyAndroid;
  const pending = new Map(); let serial = 0;
  const parse = value => { try { return JSON.parse(value); } catch { return null; } };
  function capabilities() { try { return parse(bridge?.capabilities()) || {}; } catch { return {}; } }
  function request(action, data = {}) {
    if (!bridge) return Promise.resolve(false);
    return new Promise(resolve => {
      const id = String(++serial);
      const timer = setTimeout(() => { pending.delete(id); resolve(false); }, 6000);
      pending.set(id, value => { clearTimeout(timer); pending.delete(id); resolve(value); });
      try { bridge.request(JSON.stringify({ id, action, ...data })); } catch { pending.get(id)(false); }
    });
  }
  window.BoothyNative = {
    available: Boolean(bridge), capabilities,
    ready: () => { const c = capabilities(); return c.alarms === true && c.notifications === true; },
    ownsAlerts: ride => Boolean(bridge && ride?.clockMode === 'real' && ['inTransit', 'arrived'].includes(ride.stage)),
    restore: () => { try { return bridge?.restore() || null; } catch { return null; } },
    sync(state, options, voice) { if (bridge) try { bridge.sync(JSON.stringify({ state, options, voice })); } catch {} },
    requestPermissions: () => request('permissions'),
    speak: text => request('speak', { text }),
    stopVoice: () => { if (bridge) bridge.stopSound(); },
    stopSound: () => { if (bridge) bridge.stopSound(); },
    receive(id, value) { pending.get(String(id))?.(value); },
    receiveState(raw) { document.dispatchEvent(new CustomEvent('boothynativestate', { detail: raw })); },
    location: enabled => request('location', { enabled }),
    notify: (title, body, tag) => request('notify', { title, body, tag }),
    test: () => request('test'),
    testLater: () => request('testLater')
  };
})();
