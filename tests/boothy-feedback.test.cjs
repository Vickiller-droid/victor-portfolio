const {test}=require('node:test');
const assert=require('node:assert/strict');
const {compose}=require('../public/boothy/feedback.js');
test('feedback creates an email draft with selected details and no automatic private trip data',()=>{
 const r=compose({kind:'Suggestion',message:'Clearer buttons & fewer words?',expected:'One tap',phone:'Tecno, Android 9',screen:'Screen locked',version:'0.2.5',sound:true,voice:false,trip:{lat:9.3,lng:7.4,items:['secret item']}});
 const url=new URL(r.url);
 assert.equal(url.pathname,'alabivictordaniel@gmail.com');
 assert.equal(url.searchParams.get('body'),r.body);
 assert.match(r.body,/Clearer buttons & fewer words\?/);assert.match(r.body,/Sound on · Voice off/);
 assert.doesNotMatch(r.body,/9\.3|7\.4|secret item/);assert.match(url.searchParams.get('subject'),/suggestion/);
});
test('feedback bounds text and cannot inject subject headers through version',()=>{
 const r=compose({version:'1\nBcc: other',message:'x'.repeat(9999)}),u=new URL(r.url);
 assert.doesNotMatch(u.searchParams.get('subject'),/\n/);
 assert.ok(r.body.length<1800);assert.equal(u.searchParams.get('bcc'),null);
});
