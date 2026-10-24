(function (root) {
  'use strict';
  function destination(hash, ride) {
    if (!hash.startsWith('#notification?')) return null;
    const params = new URLSearchParams(hash.slice('#notification?'.length));
    const kind = params.get('kind');
    if (kind === 'test') return { view: 'reminders', message: 'Phone test opened. Did you see a banner or a notification in the pull-down tray?' };
    if (!['before', 'end', 'transit', 'eta'].includes(kind)) return { view: 'ride' };
    if (!params.get('ride') || params.get('ride') !== String(ride.id) || !['inTransit', 'arrived'].includes(ride.stage)) return { view: 'ride', message: 'That reminder belongs to an older ride. Your current ride is shown here.' };
    if (kind === 'before' || kind === 'end') {
      if (ride.items?.some(i => !i.checked)) return { view: 'ride', checklist: ride.stage === 'arrived' ? 'end' : 'before' };
      return { view: 'ride', message: 'You’ve already checked every item for this ride.' };
    }
    return { view: 'ride', focusReminder: true };
  }
  const api = { destination };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoothyNotificationRoute = api;
})(typeof window === 'object' ? window : globalThis);
