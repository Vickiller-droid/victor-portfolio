const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(__dirname + '/../public/boothy/device.js', 'utf8');
function setup(config = {}) {
  const calls = { tones: 0, vibrations: 0, notifications: 0, stops: [], frequencies: [], notificationOptions: [], notices: [] };
  class Audio {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() {
      if (config.hang) return new Promise(() => {});
      if (config.reject) return Promise.reject(new Error('blocked'));
      return Promise.resolve().then(() => { this.state = 'running'; });
    }
    createOscillator() { return { connect() {}, disconnect() {}, frequency: { setValueAtTime(value) { calls.frequencies.push(value); } }, start() { calls.tones++; }, stop(at) { calls.stops.push(at); } }; }
    createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
  }
  class Notification { static permission = config.permission || 'granted'; constructor(title, options) { calls.notifications++; calls.notificationOptions.push(options); calls.notices.push(this); } close() {} }
  const ctx = { URLSearchParams, location: { hash: '' }, window: { focus() { calls.focused = true; }, AudioContext: config.noAudio ? undefined : Audio, Notification, isSecureContext: true }, Notification,
    navigator: { vibrate: config.noVibration ? undefined : () => { calls.vibrations++; if (config.throwVibration) throw Error('blocked'); return !config.blockVibration; } },
    localStorage: { getItem: () => JSON.stringify(config.options || { sound: true, vibration: true, notifications: true }), setItem() {} },
    setTimeout: fn => setTimeout(fn, 30), clearTimeout };
  if (config.workerHang) ctx.navigator.serviceWorker = { register: () => Promise.resolve(), ready: new Promise(() => {}) };
  if (config.worker) ctx.navigator.serviceWorker = { register: () => Promise.resolve(), ready: Promise.resolve({ showNotification: async (title, options) => { calls.notifications++; calls.notificationOptions.push(options); } }) };
  vm.runInNewContext(source, ctx);
  return { device: ctx.window.BoothyDevice, calls, location: ctx.location };
}
test('waits for delayed audio resume before playing the tone', async () => {
  const { device, calls } = setup(); const r = await device.test();
  assert.equal(calls.tones, 1); assert.equal(r.sound, 'started'); assert.equal(r.vibration, 'requested'); assert.equal(r.notification, 'requested');
});
test('audio rejection does not suppress vibration or notification', async () => {
  const { device, calls } = setup({ reject: true }); const r = await device.test();
  assert.equal(r.sound, 'failed'); assert.equal(calls.tones, 0); assert.equal(calls.vibrations, 1); assert.equal(calls.notifications, 1);
});
test('vibration rejection is reported', async () => {
  const { device } = setup({ blockVibration: true }); assert.equal((await device.test()).vibration, 'blocked'); assert.equal(await device.signal('a', 'b', 'c'), false);
});
test('vibration exception does not suppress other channels', async () => {
  const { device } = setup({ throwVibration: true }); const r = await device.test(); assert.equal(r.vibration, 'failed'); assert.equal(r.sound, 'started'); assert.equal(r.notification, 'requested');
});
test('unsupported vibration and audio report failure honestly', async () => {
  const { device } = setup({ noAudio: true, noVibration: true }); const r = await device.test(); assert.equal(r.sound, 'failed'); assert.equal(r.vibration, 'unavailable');
});
test('disabled channels do not activate hardware', async () => {
  const { device, calls } = setup({ options: {} }); const r = await device.test(); assert.deepEqual(Object.values(r), ['off', 'off', 'off']); assert.equal(calls.tones + calls.vibrations + calls.notifications, 0);
});
test('denied notifications report blocked', async () => {
  const { device } = setup({ permission: 'denied' }); assert.equal((await device.test()).notification, 'blocked');
});
test('hung audio resume returns a bounded failure', async () => {
  const { device } = setup({ hang: true }); const r = await device.test(); assert.equal(r.sound, 'failed'); assert.equal(r.notification, 'requested');
});
test('hung service worker cannot hang the test', async () => {
  const { device } = setup({ workerHang: true }); const r = await device.test(); assert.equal(r.notification, 'failed'); assert.equal(r.sound, 'started');
});
test('service worker notification path works', async () => {
  const { device, calls } = setup({ worker: true }); assert.equal((await device.test()).notification, 'requested'); assert.equal(calls.notifications, 1);
});

test('each built-in tune lasts 15 seconds and has a distinct melody', async () => {
  const melodies = [];
  for (const tone of ['chime', 'ripple', 'bright']) {
    const {device, calls} = setup(); device.setOption('tone', tone); await device.test();
    assert.equal(calls.stops.at(-1), 15); melodies.push(calls.frequencies.slice(0, 4).join(','));
  }
  assert.equal(new Set(melodies).size, 3);
});
test('stop sound cancels playback even while audio is resuming', async () => {
  const {device, calls} = setup(); const pending = device.test(); device.stopSound(); await pending;
  assert.equal(calls.tones, 0);
});
test('stop sound stops an active tone, and replacing it stops the old tone', async () => {
  const {device, calls} = setup(); await device.test(); await device.test();
  assert.ok(calls.stops.includes(undefined)); device.stopSound(); assert.equal(calls.stops.at(-1), undefined);
});
test('item confirmation is brief, respects sound off, and never interrupts a reminder', async () => {
  const {device, calls} = setup(); await device.confirmItem(); assert.equal(calls.stops.at(-1), .42);
  device.stopSound(); await device.test(); const count = calls.tones; await device.confirmItem(); assert.equal(calls.tones, count);
  device.setOption('sound', false); await device.confirmItem(); assert.equal(calls.tones, count);
});

test('phone-only test requests a system notification without a web tone', async () => {
 const {device,calls}=setup({worker:true}); assert.equal(await device.testPhone(),'requested');
 assert.equal(calls.tones,0); assert.equal(calls.notifications,1);
 assert.equal(calls.notificationOptions[0].data.kind,'test');
});
test('trip notifications carry the matching ride and reminder', async()=>{
 const {device,calls}=setup({worker:true}); await device.signal('a','b','trip-tag',{kind:'before',rideId:'ride-123'});
 const n=calls.notificationOptions[0]; assert.equal(n.data.kind,'before'); assert.equal(n.data.rideId,'ride-123'); assert.equal(n.requireInteraction,true);
});
test('desktop notification fallback opens the matching reminder',async()=>{
 const {device,calls,location}=setup(); await device.signal('a','b','trip-tag',{kind:'end',rideId:'ride-123'});
 calls.notices[0].onclick(); assert.ok(location.hash.includes('kind=end')); assert.ok(location.hash.includes('ride=ride-123')); assert.equal(calls.focused,true);
});
test('phone-only test honours disabled and denied permissions', async()=>{
 assert.equal(await setup({options:{}}).device.testPhone(),'off');
 assert.equal(await setup({permission:'denied'}).device.testPhone(),'blocked');
});
