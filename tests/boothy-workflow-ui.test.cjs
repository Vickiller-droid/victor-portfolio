const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('../public/boothy/model.js');
function harness(initial){
 const nodes=new Map(), listeners={}, commands=[], calls={ticks:0,stops:0};
 function node(){return {dataset:{},hidden:false,innerHTML:'',textContent:'',open:false,setAttribute(){},removeAttribute(){},focus(){},scrollIntoView(){},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},querySelector(){return null;}};}
 for(const id of ['main','mode-notice','page-eyebrow','page-title','page-subtitle','notice-region','view','context-panel','storage-warning','toast','belongings-title'])nodes.set('#'+id,node());
 const storage=new Map();
 const document={querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener:(n,f)=>listeners[n]=f,createElement:node,body:{append:n=>nodes.set('#'+n.id,n)}};
 const prefs={sound:false,vibration:false};let voice=false;
 const window={BoothyModel:M,BoothyNative:{available:true,restore:()=>JSON.stringify(initial),ready:()=>true,ownsAlerts:()=>true,tick(){},command:(a,d)=>{commands.push(a);return Promise.resolve(true);},sync:()=>Promise.resolve(true)},BoothyDevice:{options:()=>prefs,status:()=> 'enabled',setOption:(n,v)=>prefs[n]=v,confirmItem:()=>calls.ticks++,stopSound:()=>calls.stops++,unlockAudio(){}},BoothyVoice:{enabled:()=>voice,setEnabled:v=>voice=v,stop(){}},addEventListener(){},scrollTo(){}};
 vm.runInNewContext(fs.readFileSync('public/boothy/app.js','utf8'),{window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},location:{hash:'#ride'},history:{replaceState(){}},setInterval(){},setTimeout(){},clearTimeout(){},Date,console});
 return {nodes,listeners,commands,calls,prefs,click:async action=>listeners.click({target:{closest:s=>s==='[data-action]'?{dataset:{action}}:null}}),state:s=>listeners.boothynativestate({detail:JSON.stringify(s)}),submit:async()=>listeners.submit({preventDefault(){},target:{closest:()=>({dataset:{form:'setupItems'},reportValidity:()=>true,elements:{namedItem:()=>({value:'Phone, Bag'})}})}})};
}
test('first real trip requires explicit audio review, visual-only is a deliberate choice',async()=>{
 const h=harness(M.initial());await h.submit();
 assert.equal(h.nodes.get('#alert-setup').open,true);assert.ok(!h.commands.includes('depart'));
 await h.click('quietTrip');await h.submit();
 assert.ok(h.commands.includes('depart'));assert.equal(h.prefs.sound,false);
});
test('last native item never invokes the tick that would cancel native completion speech',()=>{
 let s=M.initial();s.config.duration=5;s=M.transition(s,'depart',{nowMs:Date.now()});
 const h=harness(s);
 s=M.transition(s,'collect',{id:0});h.state(s);assert.equal(h.calls.ticks,1);
 for(const item of s.ride.items.filter(i=>!i.checked))s=M.transition(s,'collect',{id:item.id});
 h.state(s);assert.equal(h.calls.ticks,1);assert.equal(h.nodes.get('#toast').textContent,'All items collected.');
});
test('native snooze renders persistent confirmation without replacing arrival estimate',()=>{
 let s=M.initial();s.config.duration=5;s=M.transition(s,'depart',{nowMs:Date.now()-120000});s=M.transition(s,'tick',{nowMs:Date.now()});
 const h=harness(s),eta=s.ride.etaAt;s=M.transition(s,'snoozePreArrival',{nowMs:Date.now()});h.state(s);
 assert.match(h.nodes.get('#notice-region').innerHTML,/Reminder snoozed/);
 assert.match(h.nodes.get('#notice-region').innerHTML,/snooze-countdown/);
 assert.equal(s.ride.etaAt,eta);
});

test('collecting everything replaces the popup title and keeps a trip status',()=>{
 let s=M.initial();s.config.duration=5;s=M.transition(s,'depart',{nowMs:Date.now()});
 const h=harness(s);
 for(const item of s.ride.items)s=M.transition(s,'collect',{id:item.id});
 h.state(s);
 assert.equal(h.nodes.get('#belongings-title').textContent,'You’ve got everything.');
 assert.match(h.nodes.get('#notice-region').innerHTML,/Belongings reminders stopped/);
 s=M.transition(s,'collect',{id:0});h.state(s);
 assert.doesNotMatch(h.nodes.get('#notice-region').innerHTML,/Belongings reminders stopped/);
 assert.notEqual(h.nodes.get('#belongings-title').textContent,'You’ve got everything.');
});
