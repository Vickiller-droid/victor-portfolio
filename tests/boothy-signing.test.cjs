const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('certificate gate accepts retained owner signer and rejects mismatches, missing and additional signers',()=>{
 const code=`import importlib.util\ns=importlib.util.spec_from_file_location('signing','scripts/verify-boothy-certificate.py')\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\ncert='ab'*32\nm.verify('Signer #1 certificate SHA-256 digest: '+cert, ':'.join(['AB']*32))\nfor text,expected in [('Signer #1 certificate SHA-256 digest: '+'cd'*32,cert),('',cert),('Signer #1 certificate SHA-256 digest: '+cert,'bad'),('Signer #1 certificate SHA-256 digest: '+cert+'\\nSigner #2 certificate SHA-256 digest: '+cert,cert)]:\n try:m.verify(text,expected)\n except ValueError:pass\n else:raise AssertionError('accepted wrong signer')\n`;
 const r=spawnSync('python3',['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});
