(function(root){
 'use strict';
 const clean=(v,n)=>String(v??'').replace(/\r/g,'').slice(0,n).trim();
 function compose(input){
  const kind=input.kind==='Suggestion'?'Suggestion':'Problem';
  const subject='Boothy '+kind.toLowerCase()+' · '+clean(input.version,60).replace(/\n/g,' ');
  const body=[kind+': '+clean(input.message,1200),'Expected: '+(clean(input.expected,500)||'Not specified'),'Phone / Android: '+(clean(input.phone,100)||'Not specified'),'Screen: '+clean(input.screen,60),'App: '+clean(input.version,60),'Current settings (may differ from when the issue occurred): Sound '+(input.sound?'on':'off')+' · Voice '+(input.voice?'on':'off')].join('\n\n');
  return {body,url:'mailto:alabivictordaniel@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
 }
 const api={compose};if(typeof module==='object'&&module.exports)module.exports=api;else root.BoothyFeedback=api;
})(typeof window==='object'?window:globalThis);
