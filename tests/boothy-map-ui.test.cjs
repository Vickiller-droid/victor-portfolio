const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/boothy/location.js');
function harness(){
 const nodes=new Map(),events={},tiles={},views=[];let selected,dialog;
 const node=()=>({textContent:'',disabled:false,open:false,setAttribute(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);}});
 const map={setView(p,z){views.push([p,z]);return this;},on(n,f){events[n]=f;return this;},invalidateSize(){},getZoom:()=>11,removeLayer(){},getCenter:()=>({lat:9.1,lng:7.5})};
 const L={map:()=>map,tileLayer:()=>({addTo(){return this;},on(n,f){tiles[n]=f;return this;}}),circleMarker:()=>({addTo(){return this;},bindTooltip(){return this;},setLatLng(){},setStyle(){}})};
 const document={createElement:node,body:{append:d=>dialog=d},addEventListener(){}};
 const window={L,BoothyLocation:G,addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('public/boothy/live-map.js','utf8'),{window,document,navigator:{},L,fetch:async()=>({ok:true,json:async()=>({tileUrl:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'})}),AbortController,setTimeout,clearTimeout,setInterval(){}});
 return {nodes,events,tiles,views,open:async point=>window.BoothyLiveMap.open({point,onSelect:p=>selected=p}),selected:()=>selected,dialog:()=>dialog};
}
test('map tap selects a pin but saves only on explicit confirmation',async()=>{
 const h=harness();await h.open(null);
 assert.equal(h.nodes.get('[data-map=pin]').disabled,true);
 h.events.click({latlng:{lat:9.2,lng:7.6}});
 assert.equal(h.selected(),undefined);
 assert.match(h.nodes.get('.map-selection').textContent,/9.20000, 7.60000/);
 h.nodes.get('[data-map=destination]').onclick();
 assert.equal(h.views.at(-1)[1],16);
 h.nodes.get('[data-map=pin]').onclick();
 assert.equal(h.selected().lat,9.2);assert.equal(h.dialog().open,false);
});
test('map load failures survive pin changes and recover after tile load',async()=>{
 const h=harness();await h.open({lat:9,lng:7});
 h.tiles.tileerror();h.events.click({latlng:{lat:9.2,lng:7.6}});
 assert.match(h.nodes.get('.map-status').textContent,/could not load/);
 h.nodes.get('[data-map=pinCenter]').onclick();
 assert.match(h.nodes.get('.map-status').textContent,/could not load/);
 h.tiles.tileload();assert.doesNotMatch(h.nodes.get('.map-status').textContent,/could not load/);
});
