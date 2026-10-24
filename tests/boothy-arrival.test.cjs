const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../public/boothy/model.js');
const start = mode => { let s = M.initial(); s.config.clockMode=mode; s=M.transition(s,'depart',{nowMs:100000}); return mode==='real'?s:M.transition(s,'detect',{nowMs:100000}); };
test('items can be checked before arrival and remain checked at arrival',()=>{
 let s=start('simulation'); s=M.transition(s,'collect',{id:0}); assert.equal(s.ride.items[0].checked,true); s=M.transition(s,'arrive'); assert.equal(s.ride.items[0].checked,true);
});
test('simulation snooze waits a full minute and preserves unchecked items',()=>{
 let s=M.transition(start('simulation'),'nearArrival'); s=M.transition(s,'snoozePreArrival'); assert.equal(s.ride.preArrival.status,'scheduled'); s=M.restore(JSON.stringify(s)); assert.equal(s.ride.preArrival.status,'scheduled'); s=M.transition(s,'advance'); assert.equal(s.ride.preArrival.status,'due'); assert.ok(s.ride.items.every(i=>!i.checked));
});
test('real snooze waits a full minute even with less than two minutes remaining',()=>{
 let s=start('real'); s=M.transition(s,'tick',{nowMs:280000}); assert.equal(s.ride.preArrival.status,'due'); s=M.transition(s,'snoozePreArrival',{nowMs:280000}); s=M.transition(s,'tick',{nowMs:339999}); assert.equal(s.ride.preArrival.status,'scheduled'); s=M.transition(s,'tick',{nowMs:340000}); assert.equal(s.ride.preArrival.status,'due');
});
test('acknowledgement and snooze never mark items as collected',()=>{
 let s=M.transition(start('simulation'),'nearArrival'); s=M.transition(s,'ackPreArrival'); assert.ok(s.ride.items.every(i=>!i.checked)); assert.equal(s.ride.preArrival.status,'done');
});
