(function (root) {
  'use strict';
  function point(value) {
    return value && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180 ? { lat: value.lat, lng: value.lng } : null;
  }
  function distance(a, b) {
    if (!point(a) || !point(b)) return null;
    const rad = x => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
  }
  function fix(position, now = Date.now()) {
    const c = position?.coords, at = position?.timestamp;
    const p = point(c && { lat: c.latitude, lng: c.longitude });
    if (!p || !Number.isFinite(c.accuracy) || c.accuracy < 0 || !Number.isFinite(at) || now - at > 30000 || at > now + 5000) return null;
    return { ...p, accuracy: c.accuracy, at };
  }
  function createTracker(geo, onChange, clock = Date.now) {
    let watch = null, generation = 0, current = null, status = 'off';
    const publish = (next, value = current) => { status = next; onChange({ status, fix: value }); };
    function stop() {
      generation++;
      if (watch !== null) geo?.clearWatch(watch);
      watch = null; current = null; publish('off', null);
    }
    function start() {
      if (watch !== null) return;
      if (!geo?.watchPosition) { publish('unsupported', null); return; }
      const token = ++generation; publish('locating', null);
      try {
        watch = geo.watchPosition(position => {
          if (token !== generation) return;
          const value = fix(position, clock());
          if (!value || (current && value.at < current.at)) { if (!current) publish('stale', null); return; }
          current = value; publish(value.accuracy > 100 ? 'imprecise' : 'live');
        }, error => {
          if (token !== generation) return;
          if (error.code === 1) { if (watch !== null) geo.clearWatch(watch); watch = null; generation++; current = null; publish('denied', null); }
          else publish(error.code === 3 ? 'timeout' : 'unavailable');
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
      } catch { watch = null; publish('unavailable', null); }
    }
    function refresh() {
      if (current && clock() - current.at > 30000 && !['off','denied'].includes(status)) publish('stale');
    }
    return { start, stop, refresh, running: () => watch !== null };
  }
  const api = { point, distance, fix, createTracker };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoothyLocation = api;
})(typeof window === 'object' ? window : globalThis);
