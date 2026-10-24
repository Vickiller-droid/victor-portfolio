const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const route = require('../public/boothy/notification-route.js');
const ride = {id:'123',stage:'inTransit',items:[{checked:false}]};
test('notification opens current checklist without acknowledging items',()=>{
 assert.equal(route.destination('#notification?kind=before&ride=123',ride).checklist,'before');
 assert.equal(ride.items[0].checked,false);
 assert.equal(route.destination('#notification?kind=before&ride=123',{...ride,stage:'arrived'}).checklist,'end');
});
test('old ride and already-collected items do not create a false checklist',()=>{
 assert.equal(route.destination('#notification?kind=before&ride=old',ride).checklist,undefined);
 assert.equal(route.destination('#notification?kind=before&ride=123',{...ride,items:[{checked:true}]}).checklist,undefined);
});
test('tests open alert settings and unknown input cannot navigate elsewhere',()=>{
 assert.equal(route.destination('#notification?kind=test',ride).view,'reminders');
 assert.equal(route.destination('#notification?kind=https://example.com',ride).view,'ride');
 assert.equal(route.destination('#ride',ride),null);
});
function worker(clients=[]) {
 const handlers={}, calls={opened:[], navigated:[],focused:0,closed:0};
 const self={registration:{scope:'https://example.com/boothy/'},addEventListener:(name,fn)=>handlers[name]=fn,
 skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>clients,openWindow:async url=>calls.opened.push(url)}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../public/boothy/sw.js','utf8'),{self,URL,URLSearchParams});
 async function click(data){let pending;handlers.notificationclick({notification:{data,close:()=>calls.closed++},waitUntil:p=>pending=p});await pending;}
 return {calls,click};
}
test('closed app opens the exact reminder on the Boothy origin',async()=>{
 const w=worker();await w.click({kind:'before',rideId:'123',url:'https://evil.example/'});
 const url=new URL(w.calls.opened[0]); assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,'/boothy/index.html');assert.ok(url.hash.includes('kind=before'));assert.ok(url.hash.includes('ride=123'));assert.equal(w.calls.closed,1);
});
test('existing Boothy window is reused and focused',async()=>{
 let navigated,focused=false;const client={url:'https://example.com/boothy/index.html',navigate:async url=>{navigated=url;return {focus:async()=>focused=true};}};
 const w=worker([client]); await w.click({kind:'transit',rideId:'123'});assert.ok(navigated.includes('kind=transit'));assert.equal(focused,true);assert.equal(w.calls.opened.length,0);
});
test('unrelated windows are untouched and failed navigation falls back safely',async()=>{
 const w=worker([{url:'https://example.com/portfolio',navigate:()=>{throw Error('must not navigate');}},{url:'https://example.com/boothy/index.html',navigate:async()=>{throw Error('closed');}}]);
 await w.click({kind:'test'});assert.equal(w.calls.opened.length,1);
});
