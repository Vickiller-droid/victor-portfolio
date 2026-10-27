(function () {
  'use strict';
  const key = 'boothy-alert-options-v1';
  let options = { sound: false, vibration: false, notifications: Boolean(window.BoothyNative?.available), tone: 'chime' };
  try { options = { ...options, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { /* In-app alerts remain available. */ }
  if(window.BoothyBoot?.options)options={...options,...window.BoothyBoot.options};
  const tones = { chime: { name: 'Boothy Chime', notes: [659, 831, 988, 831], beat: .5 }, ripple: { name: 'Ripple', notes: [523, 659, 784, 1047], beat: .65 }, bright: { name: 'Bright', notes: [880, 660, 880, 1175], beat: .35 } };
  if (!tones[options.tone]) options.tone = 'chime';
  let registration, audio, playback = 0, activeTag, voiceTimer;
  const activeNodes = new Set();
  function stopSound(tag) {
    if (tag && tag !== activeTag) return;
    playback++; activeTag = null; clearTimeout(voiceTimer); window.BoothyVoice?.stop(); window.BoothyNative?.stopSound();
    for (const node of activeNodes) { try { node.stop(); } catch {} }
    activeNodes.clear();
  }
  if (!window.BoothyNative?.available && navigator.serviceWorker && window.isSecureContext) {
    registration = navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch(() => null);
  }
  function save() { try { localStorage.setItem(key, JSON.stringify(options)); } catch { /* Session preference only. */ } }
  function bounded(promise, ms = 2000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Alert timed out')), ms);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
  }
  async function unlockAudio() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    try {
      if (!audio || audio.state === 'closed') audio = new Audio();
      if (audio.state !== 'running') await bounded(audio.resume());
      return audio.state === 'running';
    } catch { return false; }
  }
  async function beep(short = false, tag = 'preview', length = 15) {
    if (short && activeNodes.size) return false;
    stopSound();
    const token = playback; activeTag = tag;
    if (!await unlockAudio() || token !== playback) return false;
    try {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.connect(gain); gain.connect(audio.destination);
    const now = audio.currentTime, duration = short ? .42 : length;
    const tune = tones[options.tone];
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(.0001, now);
    if (short) {
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.setValueAtTime(980, now + .15);
      gain.gain.exponentialRampToValueAtTime(.12, now + .03);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .4);
    } else {
      for (let t = 0, note = 0; t < duration; t += tune.beat, note++) {
        oscillator.frequency.setValueAtTime(tune.notes[note % tune.notes.length], now + t);
        gain.gain.setValueAtTime(.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(.12, now + t + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, now + Math.min(t + tune.beat * .85, duration));
      }
    }
    oscillator.onended = () => { activeNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    activeNodes.add(oscillator);
    oscillator.start(now); oscillator.stop(now + duration);
    return true;
    } catch { return false; }
  }
  async function phoneNotification(title, body, tag, destination = {}) {
    if (!options.notifications) return 'off';
    if (window.BoothyNative?.available) return await window.BoothyNative.notify(title, body, tag) ? 'requested' : 'failed';
    if (!window.Notification || !window.isSecureContext) return 'unavailable';
    if (Notification.permission !== 'granted') return 'blocked';
    try {
      const worker = await bounded(registration);
      const kind = ['before', 'end', 'transit', 'eta', 'test'].includes(destination.kind) ? destination.kind : 'ride';
      const rideId = String(destination.rideId || '');
      const route = 'notification?' + new URLSearchParams({ kind, ride: rideId });
      const settings = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', requireInteraction: true, renotify: Boolean(tag), data: { kind, rideId } };
      if (options.vibration) settings.vibrate = [180, 80, 180];
      if (worker) await bounded(worker.showNotification(title, settings));
      else {
        const n = new Notification(title, settings);
        n.onclick = () => { window.focus(); location.hash = route; n.close(); };
      }
      return 'requested';
    } catch { return 'failed'; }
  }
  async function notify(title, body, tag, destination) {
    if(window.BoothyNative?.available&&tag==='boothy-test'){const ok=await window.BoothyNative.test();return {sound:options.sound?(ok?'requested':'failed'):'off',vibration:options.vibration?(ok?'requested':'failed'):'off',notification:ok?'requested':'failed'};}
    // Start each channel independently, retaining the button's user activation.
    const spoken = Boolean(destination?.voiceText && window.BoothyVoice?.enabled());
    const sound = options.sound ? beep(false, tag, spoken ? 1.2 : 15) : Promise.resolve(null);
    let vibration = 'off';
    if (options.vibration) {
      vibration = 'unavailable';
      if (navigator.vibrate) {
        try { vibration = navigator.vibrate([180, 80, 180]) ? 'requested' : 'blocked'; }
        catch { vibration = 'failed'; }
      }
    }
    const [played, notification] = await Promise.all([sound, phoneNotification(title, body, tag, destination)]);
    if (destination?.voiceText && window.BoothyVoice?.enabled()) {
      const expected = playback;
      voiceTimer = setTimeout(async () => {
        if (expected !== playback) return;
        await window.BoothyVoice.speakText(destination.voiceText);
        if (expected === playback && options.sound) beep(false, tag, 12);
      }, played ? 1200 : 0);
    }
    return { sound: played === null ? 'off' : played ? 'started' : 'failed', vibration, notification };
  }
  function status() {
    if (window.BoothyNative?.available) return window.BoothyNative.capabilities().notifications ? 'enabled' : 'blocked';
    if (!window.Notification || !window.isSecureContext) return 'unavailable';
    if (Notification.permission === 'denied') return 'blocked';
    if (options.notifications && Notification.permission === 'granted') return 'enabled';
    return 'off';
  }
  window.BoothyDevice = {
    options: () => ({ ...options }), status, unlockAudio, stopSound,
    tones: () => Object.entries(tones).map(([id, tone]) => ({ id, name: tone.name })),
    confirmItem: () => options.sound ? beep(true) : Promise.resolve(false),
    capabilities: () => ({ sound: Boolean(window.AudioContext || window.webkitAudioContext), vibration: Boolean(window.BoothyNative?.available || navigator.vibrate), gps: Boolean(navigator.geolocation) }),
    setOption(name, value) {
      if (name === 'tone' && tones[value]) { stopSound(); options.tone = value; save(); }
      if (['sound', 'vibration'].includes(name)) { options[name] = Boolean(value); if (name === 'sound') { if (value) unlockAudio(); else stopSound(); } save(); }
    },
    async toggleNotifications() {
      if(window.BoothyNative?.available){await window.BoothyNative.requestPermissions();return status();}
      if (status() === 'enabled') { options.notifications = false; save(); return 'off'; }
      if (window.BoothyNative?.available) { await window.BoothyNative.requestPermissions(); options.notifications = Boolean(window.BoothyNative.capabilities().notifications); save(); return status(); }
      if (status() === 'unavailable' || status() === 'blocked') return status();
      // Called directly from an explicit button click, before any other await.
      const permission = await Notification.requestPermission();
      options.notifications = permission === 'granted'; save(); return status();
    },
    signal: async (...args) => {
      const report = await notify(...args);
      return !Object.values(report).some(value => ['failed', 'blocked', 'unavailable'].includes(value));
    },
    test: () => notify('Boothy · Test alert', 'A reminder with its reason. Keep Boothy open for the ride timer.', 'boothy-test'),
    testPhone: () => phoneNotification('Boothy · Phone notification test', 'Tap to return to Boothy. This is a test, not a trip reminder.', 'boothy-phone-test', { kind: 'test' }),
    close(tag) {
      stopSound(tag);
      if (registration) registration.then(worker => worker?.getNotifications({ tag })).then(items => items?.forEach(n => n.close())).catch(() => {});
    },
    captureParking() {
      return new Promise((resolve, reject) => {
        const geo=window.BoothyNative?.geolocation || navigator.geolocation;
        if (!geo) { reject(new Error('This browser cannot capture a location. You can still save a parking note.')); return; }
        geo.getCurrentPosition(position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }), error => {
          reject(new Error(error.code === 1 ? 'Location access was declined. Your saved parking note is still kept.' : error.code === 3 ? 'Location capture timed out. Try again outdoors, or save a note.' : 'Your location is unavailable. Try again outdoors, or save a note.'));
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      });
    }
  };
})();

