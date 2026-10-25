(function (root) {
  'use strict';
  function acceptRoute(route) {
    const seconds = Number(route?.durationMillis) / 1000, distance = Number(route?.distanceMeters);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400 || !Number.isFinite(distance) || distance < 0) return null;
    return { seconds, distance };
  }
  function mayRequest(last, fix, now, count) {
    if (!fix || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.accuracy > 100 || !Number.isFinite(fix.at) || now - fix.at > 30000 || fix.at > now + 5000 || count >= 120) return false;
    return !last || now - last >= 60000;
  }
  const api = { acceptRoute, mayRequest };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BoothyRoutePolicy = api;
})(typeof window === 'object' ? window : globalThis);
