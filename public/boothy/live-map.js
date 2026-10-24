(function () {
  'use strict';
  const G = window.BoothyLocation;
  let dialog, map, marker, accuracyCircle, pin, pendingPoint, target, onSelect;
  let latest = { status: 'off', fix: null }, follow = true, loading = null, keepTracking = false;
  const tracker = G.createTracker(navigator.geolocation, update);
  const labels = { off: 'GPS is off.', locating: 'Finding your location…', live: 'Live location', imprecise: 'Location is approximate. Move outdoors for a better fix.', stale: 'Location has not updated. Keep Boothy open and check GPS.', denied: 'Location is blocked. Allow it in this site’s permissions, then try again.', timeout: 'GPS is taking longer. Try again outdoors.', unavailable: 'Location is unavailable. Your trip timer still works.', unsupported: 'This browser cannot provide location.' };
  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'live-map-dialog'; dialog.setAttribute('aria-labelledby', 'live-map-title');
    dialog.innerHTML = '<div class="map-dialog-header"><h2 id="live-map-title">Your trip map</h2><button type="button" class="text-button" data-map="close">Close map</button></div><p class="small-copy map-explanation">Tap the map to choose a destination pin. GPS works while Boothy stays active.</p><div id="live-map-canvas" role="region" aria-label="Interactive OpenStreetMap"></div><p class="map-status" role="status" aria-live="polite">Load the map to get started.</p><p class="map-distance"></p><div class="map-controls"><button type="button" class="button primary" data-map="gps">Use my live location</button><button type="button" class="button outline" data-map="center" disabled>Centre on me</button><button type="button" class="button outline" data-map="pinCenter">Pin map centre</button><button type="button" class="button outline" data-map="pin" disabled>Use destination pin</button></div><p class="small-copy map-privacy">Map tiles are supplied by OpenStreetMap for the area you view. Your live GPS fixes stay in this tab; no travel history is saved. This map does not calculate road routes or arrival times.</p>';
    document.body.append(dialog);
    dialog.querySelector('[data-map=close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => { if (!keepTracking) tracker.stop(); });
    dialog.querySelector('[data-map=gps]').onclick = () => { if (tracker.running()) tracker.stop(); else { follow = true; tracker.start(); } paint(); };
    dialog.querySelector('[data-map=center]').onclick = () => { if (latest.fix && map) { follow = true; map.setView([latest.fix.lat, latest.fix.lng], 15); } };
    dialog.querySelector('[data-map=pinCenter]').onclick = () => { if (map) { follow = false; const c = map.getCenter(); pendingPoint = { lat: c.lat, lng: c.lng }; showPin(pendingPoint); paint(); } };
    dialog.querySelector('[data-map=pin]').onclick = () => { if (!pendingPoint) return; target = { ...pendingPoint }; onSelect?.(target); paint(); dialog.close(); };
  }
  function update(value) {
    latest = value;
    if (map && value.fix) {
      const p = [value.fix.lat, value.fix.lng];
      if (!marker) marker = L.circleMarker(p, { radius: 8, color: '#fff', weight: 3, fillColor: '#27665b', fillOpacity: 1 }).addTo(map).bindTooltip('Your location');
      else marker.setLatLng(p);
      if (!accuracyCircle) accuracyCircle = L.circle(p, { radius: value.fix.accuracy, color: '#27665b', weight: 1, fillOpacity: .08 }).addTo(map);
      else accuracyCircle.setLatLng(p).setRadius(value.fix.accuracy);
      if (follow && dialog.open) map.setView(p, Math.max(map.getZoom(), 15));
      marker.setStyle({ fillColor: value.status === 'live' ? '#27665b' : '#8a8176' });
    } else if (map && marker) { map.removeLayer(marker); marker = null; if (accuracyCircle) map.removeLayer(accuracyCircle); accuracyCircle = null; }
    paint();
  }
  function paint() {
    if (!dialog) return;
    const accuracy = latest.fix ? ' · ±' + Math.round(latest.fix.accuracy) + ' m' : '';
    dialog.querySelector('.map-status').textContent = (labels[latest.status] || labels.unavailable) + accuracy;
    const selected = pendingPoint || target;
    const d = latest.status === 'live' && latest.fix && selected ? G.distance(latest.fix, selected) : null;
    dialog.querySelector('.map-distance').textContent = d === null ? '' : (d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m') + ' to your pin · straight-line distance';
    dialog.querySelector('[data-map=gps]').textContent = tracker.running() ? 'Stop live location' : 'Use my live location';
    dialog.querySelector('[data-map=center]').disabled = !latest.fix;
    dialog.querySelector('[data-map=pin]').disabled = !pendingPoint;
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = ''; document.head.append(css);
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; script.crossOrigin = '';
      const timer = setTimeout(() => { script.remove(); css.remove(); reject(Error('map library timeout')); }, 12000);
      script.onload = () => { clearTimeout(timer); resolve(); }; script.onerror = () => { clearTimeout(timer); script.remove(); css.remove(); reject(Error('map library unavailable')); }; document.head.append(script);
    });
  }
  async function open(options) {
    ensureDialog(); target = G.point(options.point); pendingPoint = target; onSelect = options.onSelect; keepTracking = Boolean(options.keepTracking);
    if (!dialog.open) dialog.showModal();
    paint();
    if (!map) {
      dialog.querySelector('.map-status').textContent = 'Loading map…';
      try {
        if (!loading) loading = (async () => {
          const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000);
          try {
            const [response] = await Promise.all([fetch('map-config.json', { signal: controller.signal }), loadLeaflet()]);
            if (!response.ok) throw Error('map configuration unavailable');
            const config = await response.json();
            if (!config.tileUrl?.startsWith('https://')) throw Error('map configuration invalid');
            map = L.map('live-map-canvas', { zoomControl: true, scrollWheelZoom: false });
            L.tileLayer(config.tileUrl, { attribution: '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>', maxZoom: Math.min(19, Number(config.maxZoom) || 19), keepBuffer: 0 }).addTo(map).on('tileerror', () => { dialog.querySelector('.map-status').textContent = 'Map tiles could not load. Check your connection; your trip timer still works.'; });
            map.setView([9.06, 7.49], 11);
            map.on('dragstart', () => { follow = false; });
            map.on('click', event => {
              follow = false;
              pendingPoint = { lat: event.latlng.lat, lng: event.latlng.lng };
              showPin(pendingPoint); paint();
              dialog.querySelector('.map-status').textContent = 'Pin selected. Tap “Use destination pin” to save it.';
            });
          } finally { clearTimeout(timer); }
        })().catch(error => { loading = null; throw error; });
        await loading;
      } catch { dialog.querySelector('.map-status').textContent = 'The map could not load. Check your connection, close the map and try again. Your trip timer still works.'; return; }
    }
    map.invalidateSize();
    if (target) { showPin(target); map.setView([target.lat, target.lng], 14); }
    else if (pin) { map.removeLayer(pin); pin = null; }
    if (latest.fix) update(latest); else paint();
  }
  function showPin(value) {
    if (!map) return;
    if (pin) pin.setLatLng([value.lat, value.lng]);
    else pin = L.circleMarker([value.lat, value.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#e65d27', fillOpacity: 1 }).addTo(map).bindTooltip('Destination pin');
  }
  function stop() { tracker.stop(); if (dialog?.open) dialog.close(); }
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tracker.refresh(); paint(); } });
  setInterval(() => tracker.refresh(), 10000);
  window.BoothyLiveMap = { open, stop };
})();
