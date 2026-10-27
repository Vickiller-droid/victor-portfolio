(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const initial = () => ({
    version: 1,
    config: {
      origin: '', destination: '', duration: 15, clockMode: 'real', transport: 'passenger',
      items: ['Phone', 'Bag', 'Keys'],
      transit: { enabled: false, message: '', reason: '', at: 2 },
      end: { message: 'Check your things', reason: 'Make sure nothing is left behind.' },
      saveParking: false, parkingNote: ''
    },
    ride: { stage: 'ready', elapsed: 0, events: [] }, parking: null
  });
  const event = (s, message) => { s.ride.events.unshift({ minute: s.ride.elapsed, message }); s.ride.events = s.ride.events.slice(0, 15); };
  const routeFresh = (r, now = r.clockAt) => !r.needsResume && (r.etaSource !== 'route' || (!r.routePaused && Number.isFinite(r.routeUpdatedAt) && now - r.routeUpdatedAt <= 90000));
  const deliver = s => {
    if (s.ride.needsResume) return;
    const fresh = routeFresh(s.ride);
    if (!fresh && !s.ride.trackingWarningSent) { s.ride.trackingWarningSent = true; event(s, 'Live timing paused · reconnect location or enter a new time'); }
    const elapsedMinutes = s.ride.clockMode === 'real' ? (s.ride.clockAt - s.ride.startedAt) / 60000 : s.ride.elapsed;
    if (s.ride.transit?.status === 'scheduled' && elapsedMinutes >= s.ride.transit.at) {
      s.ride.transit.status = 'due';
      event(s, 'In-transit reminder delivered');
    }
    const pre = s.ride.preArrival;
    const preDue = pre?.snoozeUntil != null ? (s.ride.clockMode === 'real' ? s.ride.clockAt : s.ride.elapsed) >= pre.snoozeUntil : remainingSeconds(s.ride) <= (s.ride.warningLeadSeconds ?? 180);
    if (pre?.status === 'scheduled' && preDue && (fresh || pre.snoozeUntil != null)) {
      s.ride.preArrival.status = 'due';
      s.ride.preArrival.deliveredAt = s.ride.elapsed;
      s.ride.preArrival.deliveredAtMs = s.ride.clockAt;
      s.ride.preArrival.repeatCount = s.ride.preArrival.repeatCount || 0;
      delete s.ride.preArrival.snoozeUntil;
      event(s, s.ride.clockMode === 'real' && remainingSeconds(s.ride) < 175 ? 'Belongings alert delivered · recovered after timer delay' : 'Belongings alert delivered · 3 minutes before estimated arrival');
    }
    if (pre?.status === 'due' && fresh && !pre.interacted && (pre.repeatCount || 0) === 0 && pre.deliveredAt != null) {
      const age = s.ride.clockMode === 'real' ? (s.ride.clockAt - (pre.deliveredAtMs || s.ride.clockAt)) / 1000 : (s.ride.elapsed - pre.deliveredAt) * 60;
      if (age >= 60 && !s.ride.items.every(item => item.checked)) {
        pre.repeatCount = 1;
        event(s, 'Belongings reminder repeated once');
      }
    }
  };
  function remainingSeconds(r) {
    return r.clockMode === 'real' ? Math.max(0, Math.ceil((r.etaAt - r.clockAt) / 1000)) : Math.max(0, (r.duration - r.elapsed) * 60);
  }
  function startRide(s, data = {}) {
    const r = s.ride;
    r.stage = 'inTransit';
    r.origin = s.config.origin; r.destination = s.config.destination;
    r.duration = Math.max(3, Math.min(999, Number(s.config.duration) || 5));
    r.warningLeadSeconds = Math.min(180, r.duration * 40);
    r.clockMode = s.config.clockMode === 'real' ? 'real' : 'simulation';
    r.transport = s.config.transport === 'passenger' ? 'passenger' : 'car';
    r.startedAt = Number(data.nowMs) || Date.now(); r.clockAt = r.startedAt;
    r.id = String(r.startedAt);
    const point = s.config.destinationPoint;
    if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180) r.destinationPoint = { lat: point.lat, lng: point.lng };
    r.etaAt = r.startedAt + r.duration * 60000; r.etaReached = false;
    r.preArrival = { status: 'scheduled', deliveredAt: null, revision: 0 };
    r.transit = { ...clone(s.config.transit), status: s.config.transit.enabled === false ? 'off' : 'scheduled' };
    r.end = { ...clone(s.config.end), done: false };
    r.items = s.config.items.map((name, index) => ({ id: index, name, checked: false }));
    r.saveParking = s.config.saveParking && r.transport === 'car'; r.parkingNote = s.config.parkingNote;
    event(s, r.clockMode === 'real' ? 'Ride started manually · estimated arrival set' : 'Ride started automatically');
    deliver(s);
  }
  function finishArrival(s, data = {}) {
    const r = s.ride;
    r.stage = 'arrived';
    if (r.items.length && r.items.every(item => item.checked)) r.end.done = true;
    if (r.transit.status === 'scheduled') { r.transit.status = 'missed'; event(s, 'Ride ended before the in-transit reminder was due'); }
    if (r.preArrival.status === 'scheduled') r.preArrival.status = 'missed';
    if (r.preArrival.status === 'due') r.preArrival.status = 'closed';
    r.arrivedAt = data.now || new Date().toISOString();
    event(s, 'Arrival confirmed · check belongings');
    if (r.saveParking) {
      s.parking = { location: r.destination, note: r.parkingNote, savedAt: r.arrivedAt, source: r.clockMode === 'real' ? 'note' : 'simulation' };
      event(s, 'Parking location saved');
    }
  }
  function transition(state, action, data = {}) {
    const s = clone(state), r = s.ride;
    switch (action) {
      case 'configure': {
        const c = data.config;
        if (c) s.config = clone(c);
        if (r.stage === 'inTransit' && data.updateTransit) {
          r.transit = { ...clone(s.config.transit), status: s.config.transit.enabled === false ? 'off' : 'scheduled' };
          event(s, 'In-transit reminder updated'); deliver(s);
        }
        break;
      }
      case 'depart':
        if (r.stage !== 'ready') break;
        s.ride = { stage: 'detecting', elapsed: 0, events: [] };
        if (s.config.clockMode === 'real') startRide(s, data);
        else event(s, 'Simulated movement detected');
        break;
      case 'detect':
        if (r.stage !== 'detecting') break;
        startRide(s, data); break;
      case 'advance':
        if (r.stage !== 'inTransit' || r.clockMode === 'real') break;
        r.elapsed = Math.min(r.elapsed + 1, r.duration); deliver(s);
        if (r.elapsed >= r.duration) finishArrival(s, data);
        break;
      case 'nearArrival':
        if (r.stage !== 'inTransit' || r.clockMode === 'real' || r.elapsed >= r.duration - 3) break;
        r.elapsed = r.duration - 3; deliver(s); break;
      case 'tick':
        if (r.stage !== 'inTransit' || r.clockMode !== 'real') break;
        r.clockAt = Math.max(r.clockAt, Number(data.nowMs) || Date.now());
        r.elapsed = Math.floor((r.clockAt - r.startedAt) / 60000);
        deliver(s);
        if (routeFresh(r) && remainingSeconds(r) === 0 && !r.etaReached) {
          r.etaReached = true; event(s, 'Estimated arrival reached · waiting for your confirmation');
        }
        break;
      case 'updateEta': {
        if (r.stage !== 'inTransit') break;
        const minutes = Number(data.minutes);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 999) break;
        if (r.clockMode === 'real') {
          r.clockAt = Math.max(r.clockAt, Number(data.nowMs) || Date.now());
          r.elapsed = Math.floor((r.clockAt - r.startedAt) / 60000);
          r.etaAt = r.clockAt + minutes * 60000;
          r.duration = (r.etaAt - r.startedAt) / 60000;
        } else r.duration = r.elapsed + minutes;
        r.etaReached = false; r.etaSource = 'manual'; r.routePaused = false; r.needsResume = false; r.trackingWarningSent = false; delete r.routeUpdatedAt;
        if (minutes > 3) r.preArrival = { status: 'scheduled', deliveredAt: null, revision: (r.preArrival.revision || 0) + 1 };
        event(s, 'Arrival estimate updated · ' + minutes + ' minutes remaining'); deliver(s);
        break;
      }
      case 'setDestinationPoint': {
        const p = data.point;
        if (r.stage === 'inTransit' && p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180) { r.destinationPoint = { lat: p.lat, lng: p.lng }; s.config.destinationPoint = { ...r.destinationPoint }; if (r.etaSource === 'route') { r.routePaused = true; deliver(s); } }
        break;
      }
      case 'interactReminder':
        if (r.preArrival?.status === 'due') r.preArrival.interacted = true;
        break;
      case 'updateRouteEta': {
        if (r.stage !== 'inTransit' || r.clockMode !== 'real' || data.rideId !== r.id) break;
        const duration = Number(data.seconds), observedAt = Number(data.observedAt), now = Number(data.nowMs) || Date.now();
        if (!Number.isFinite(duration) || duration < 0 || duration > 86400 || !Number.isFinite(observedAt) || now - observedAt > 45000 || observedAt > now + 5000 || observedAt <= (r.routeUpdatedAt || 0) || (data.destinationPoint && (data.destinationPoint.lat !== r.destinationPoint?.lat || data.destinationPoint.lng !== r.destinationPoint?.lng))) break;
        r.clockAt = Math.max(r.clockAt, now);
        r.etaAt = observedAt + duration * 1000;
        r.etaSource = 'route'; r.routeUpdatedAt = observedAt; r.routePaused = false; r.needsResume = false; r.trackingWarningSent = false;
        r.duration = (r.etaAt - r.startedAt) / 60000;
        r.etaReached = remainingSeconds(r) === 0;
        deliver(s); break;
      }
      case 'pauseRoute':
      case 'useManualEta':
        if (r.stage === 'inTransit' && r.etaSource === 'route') { r.routePaused = true; deliver(s); }
        break;
      case 'updateItems': {
        const items = Array.isArray(data.items) ? [...new Set(data.items.map(x => String(x).trim().slice(0, 50)).filter(Boolean))].slice(0, 12) : [];
        if (!items.length) break;
        s.config.items = items;
        if (['inTransit', 'arrived'].includes(r.stage)) {
          r.items = items.map((name, id) => ({ id, name, checked: r.items.some(old => old.name === name && old.checked) }));
          if (r.stage === 'arrived') r.end.done = false;
        }
        break;
      }
      case 'cancelRide':
        if (['inTransit', 'detecting'].includes(r.stage)) s.ride = { stage: 'ready', elapsed: 0, events: [] };
        break;
      case 'ackPreArrival':
        if (r.stage !== 'inTransit' || r.preArrival.status !== 'due') break;
        r.preArrival.status = 'done'; event(s, 'Pre-arrival belongings alert acknowledged'); break;
      case 'snoozePreArrival':
        if (r.stage !== 'inTransit' || r.preArrival?.status !== 'due') break;
        r.preArrival.status = 'scheduled'; r.preArrival.interacted = false; r.preArrival.repeatCount = 1;
        r.preArrival.snoozeUntil = r.clockMode === 'real' ? Math.max(r.clockAt, Number(data.nowMs) || Date.now()) + 60000 : r.elapsed + 1;
        event(s, 'Belongings alert snoozed for 1 minute'); break;
      case 'ackTransit':
        if (r.transit?.status !== 'due') break;
        r.transit.status = 'done'; event(s, 'In-transit reminder marked done'); break;
      case 'snooze':
        if (r.stage !== 'inTransit' || r.transit?.status !== 'due') break;
        r.transit.at = r.clockMode === 'real' ? (r.clockAt - r.startedAt) / 60000 + 1 : r.elapsed + 1; r.transit.status = 'scheduled';
        event(s, 'In-transit reminder snoozed for 1 minute'); break;
      case 'arrive':
        if (r.stage !== 'inTransit') break;
        finishArrival(s, data);
        break;
      case 'collect':
        if (!['inTransit', 'arrived'].includes(r.stage)) break;
        r.items = r.items.map(item => item.id === Number(data.id) ? { ...item, checked: !item.checked } : item);
        if (r.preArrival) r.preArrival.interacted = true;
        break;
      case 'ackEnd':
        if (r.stage !== 'arrived' || r.end.done) break;
        r.end.done = true; event(s, 'Ride-end reminder marked done'); break;
      case 'newRide':
        if (r.stage !== 'arrived') break;
        if (!r.end.done || !r.items.every(item => item.checked) || r.transit.status === 'due') break;
        s.ride = { stage: 'ready', elapsed: 0, events: [] }; break;
      case 'cancelDetection':
        if (r.stage === 'detecting') s.ride = { stage: 'ready', elapsed: 0, events: [] };
        break;
      case 'saveParking':
        if (data.location?.trim()) {
          const location = data.location.trim().slice(0, 100);
          const previous = s.parking?.location === location ? s.parking : null;
          s.parking = { location, note: (data.note || '').trim().slice(0, 160), savedAt: data.now || new Date().toISOString(), source: previous?.source || 'note', ...(previous?.coords ? { coords: previous.coords } : {}) };
        }
        break;
      case 'captureParking': {
        const c = data.coords;
        if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) break;
        s.parking = { location: String(data.location || 'My parking spot').slice(0, 100), note: String(data.note || '').slice(0, 160), savedAt: data.now || new Date().toISOString(), source: 'gps', coords: { lat: c.lat, lng: c.lng, accuracy: Math.max(0, Number(c.accuracy) || 0) } };
        break;
      }
    }
    return s;
  }
  function restore(raw) {
    try {
      const s = JSON.parse(raw);
      if (s.version !== 1 || !s.config || !s.ride || !['ready', 'detecting', 'inTransit', 'arrived'].includes(s.ride.stage)) return initial();
      if (typeof s.config.origin !== 'string' || typeof s.config.destination !== 'string' || !Array.isArray(s.config.items) || !s.config.items.every(i => typeof i === 'string') || !s.config.transit || !s.config.end) return initial();
      if (['inTransit', 'arrived'].includes(s.ride.stage) && (!s.ride.transit || !s.ride.end || !Array.isArray(s.ride.items))) return initial();
      s.config.duration = Math.max(3, Math.min(999, Number(s.config.duration) || 5));
      s.config.clockMode = s.config.clockMode === 'real' ? 'real' : 'simulation';
      s.config.transport = s.config.transport === 'passenger' ? 'passenger' : 'car';
      if (['inTransit', 'arrived'].includes(s.ride.stage)) {
        s.ride.duration = Number(s.ride.duration) || Math.max(s.config.duration, s.ride.elapsed + 2);
        s.ride.clockMode = s.ride.clockMode === 'real' && Number.isFinite(s.ride.etaAt) && Number.isFinite(s.ride.startedAt) ? 'real' : 'simulation';
        s.ride.transport ||= 'car';
        s.ride.preArrival ||= { status: s.ride.stage === 'arrived' ? 'missed' : 'scheduled', deliveredAt: null, revision: 0 };
        if (s.ride.stage === 'inTransit' && s.ride.clockMode !== 'real') deliver(s);
      }
      return s;
    } catch { return initial(); }
  }
  const api = { initial, transition, restore, remainingSeconds, routeFresh };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoothyModel = api;
})(typeof window === 'object' ? window : globalThis);

