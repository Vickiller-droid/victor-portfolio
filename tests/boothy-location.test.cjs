const test=require('node:test');
const assert=require('node:assert/strict');
const G=require('../public/boothy/location.js');
const M=require('../public/boothy/model.js');
test('distance uses real coordinates and rejects invalid pins',()=>{
 assert.equal(G.distance({lat:0,lng:0},{lat:0,lng:0}),0);
 assert.ok(Math.abs(G.distance({lat:0,lng:0},{lat:0,lng:1})-111195)<2);
 assert.equal(G.distance({lat:91,lng:0},{lat:0,lng:0}),null);
});
test('invalid, stale and future fixes are rejected',()=>{
 const pos={coords:{latitude:9,longitude:7,accuracy:15},timestamp:100000};
 assert.equal(G.fix(pos,100001).accuracy,15);
 assert.equal(G.fix({...pos,timestamp:1},100000),null);
 assert.equal(G.fix({...pos,timestamp:200000},100000),null);
 assert.equal(G.fix({...pos,coords:{...pos.coords,accuracy:-1}},100000),null);
});
function tracker(){let success,error,now=100000;const seen=[],cleared=[];const geo={watchPosition:(s,e)=>{success=s;error=e;return 0;},clearWatch:id=>cleared.push(id)};
 const t=G.createTracker(geo,value=>seen.push(value),()=>now);
 return {t,seen,cleared,success:p=>success(p),error:e=>error(e),time:n=>now=n};}
test('watch starts only explicitly, handles ID zero, and stops cleanly',()=>{
 const x=tracker();assert.equal(x.t.running(),false);x.t.start();assert.equal(x.t.running(),true);x.t.stop();assert.deepEqual(x.cleared,[0]);assert.equal(x.seen.at(-1).fix,null);
 x.success({coords:{latitude:9,longitude:7,accuracy:10},timestamp:100000});assert.equal(x.seen.at(-1).status,'off');
});
test('accurate movement updates and old fixes cannot move the marker backwards',()=>{
 const x=tracker();x.t.start();x.success({coords:{latitude:9,longitude:7,accuracy:10},timestamp:100000});assert.equal(x.seen.at(-1).status,'live');
 x.time(110000);x.success({coords:{latitude:9.1,longitude:7,accuracy:20},timestamp:110000});
 x.success({coords:{latitude:9,longitude:7,accuracy:10},timestamp:100000});assert.equal(x.seen.at(-1).fix.lat,9.1);
});
test('poor accuracy and stale updates never claim a fresh precise fix',()=>{
 const x=tracker();x.t.start();x.success({coords:{latitude:9,longitude:7,accuracy:300},timestamp:100000});assert.equal(x.seen.at(-1).status,'imprecise');
 x.time(131000);x.t.refresh();assert.equal(x.seen.at(-1).status,'stale');
});
test('denial ends tracking and unsupported browsers fail clearly',()=>{
 const x=tracker();x.t.start();x.error({code:1});assert.equal(x.t.running(),false);assert.equal(x.seen.at(-1).status,'denied');assert.deepEqual(x.cleared,[0]);
 let status;G.createTracker(null,s=>status=s.status).start();assert.equal(status,'unsupported');
});
test('destination pins persist on the trip without changing its manual ETA',()=>{
 let s=M.initial();s.config.destinationPoint={lat:9,lng:7};s=M.transition(s,'depart',{nowMs:100000});assert.equal(s.ride.destinationPoint.lat,9);
 const eta=s.ride.etaAt;s=M.transition(s,'setDestinationPoint',{point:{lat:9.2,lng:7.2}});assert.equal(s.ride.destinationPoint.lat,9.2);assert.equal(s.ride.etaAt,eta);
 s=M.transition(s,'setDestinationPoint',{point:{lat:99,lng:7}});assert.equal(s.ride.destinationPoint.lat,9.2);
});
