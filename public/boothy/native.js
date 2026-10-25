(function () {
  'use strict';
  const channel = window.BoothyChannel, boot = window.BoothyBoot;
  const available = Boolean(channel && boot), pending = new Map(), watches = new Map();
  let serial = 0, watchId = 0, caps = boot?.caps || {}, lastState = boot?.state || null, syncing = false;
  const parse = value => { try { return JSON.parse(value); } catch { return null; } };
  function request(action, data = {}, timeout = 8000) {
    if (!available) return Promise.resolve(false);
    return new Promise(resolve => {
      const id = String(++serial), timer = setTimeout(() => { pending.delete(id); resolve(false); }, timeout);
      pending.set(id, value => { clearTimeout(timer); pending.delete(id); resolve(value); });
      try { channel.postMessage(JSON.stringify({ id, action, ...data })); } catch { pending.get(id)(false); }
    });
  }
  const api = {
    available, capabilities: () => ({ ...caps }), ready: () => caps.alarms === true && caps.notifications === true,
    ownsAlerts: ride => available && ride?.clockMode === 'real' && ['inTransit','arrived'].includes(ride.stage),
    restore: () => lastState ? JSON.stringify(lastState) : null,
    init(state, options, voice) { if (available && !lastState) return request('init', { payload:{ state, options, voice } }); },
    sync(state, options, voice) { if (available) return request('preferences', { options, voice }); },
    command: (command, data = {}) => request('command', { command, data }),
    async tick() { if (syncing) return; syncing = true; try { await request('command', { command:'tick', data:{} }); } finally { syncing=false; } },
    requestPermissions: () => request('permissions'), speak: text => request('speak', { text }),
    stopVoice: () => request('stopSound'), stopSound: () => request('stopSound'),
    receive(id, value) { pending.get(String(id))?.(value); },
    receiveState(raw) { const state=parse(raw); if(!state?.ride)return;lastState=state;document.dispatchEvent(new CustomEvent('boothynativestate',{detail:raw})); },
    receiveCapabilities(value) { const changed=JSON.stringify(caps)!==JSON.stringify(value);caps=value;if(changed)document.dispatchEvent(new Event('boothynativecapabilities')); },
    receiveLocation(raw) { const p=parse(raw);if(p)for(const w of watches.values())w.success(p); },
    locationError(message) { for(const w of watches.values())w.error?.({code:2,message}); },
    location: enabled => request('location',{enabled},60000), routing: enabled => request('route',{enabled}),
    notify: (title,body,tag) => request('notify',{title,body,tag}),test:()=>request('test'),testLater:()=>request('testLater'),cancelTest:()=>request('cancelTest'),diagnostics:()=>request('diagnostics'),
    geolocation: available ? {
      watchPosition(success,error){const id=++watchId;watches.set(id,{success,error});api.location(true).then(ok=>{if(!ok&&watches.has(id)){watches.delete(id);error?.({code:1,message:'Start a ride and allow precise location first.'});}});return id;},
      clearWatch(id){const had=watches.delete(id);if(had&&!watches.size)api.location(false);},
      getCurrentPosition(success,error){request('point',{},60000).then(p=>{if(p?.coords)success(p);else error?.({code:2,message:'Location unavailable. Allow precise location and try outdoors.'});});}
    } : null
  };
  window.BoothyNative=api;
})();
