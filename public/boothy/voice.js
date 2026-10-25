(function (root) {
  'use strict';
  const key = 'boothy-voice-v1';
  let enabled = false, generation = 0, settle;
  try { enabled = root.localStorage?.getItem(key) === 'on'; } catch {}
  if(typeof root.BoothyBoot?.voice==='boolean')enabled=root.BoothyBoot.voice;
  function message(items, arrived) {
    const names = (items || []).filter(item => !item.checked).map(item => String(typeof item === 'string' ? item : item.name || '').trim().slice(0, 50)).filter(Boolean);
    const selected = names.slice(0, 4);
    let list = selected.length < 2 ? selected.join('') : selected.slice(0, -1).join(', ') + ' and ' + selected.at(-1);
    if (names.length > 4) list += ', and your other things';
    return (arrived ? 'Before you leave. ' : 'You’re almost there. ') + (list ? 'Remember your ' + list + '. ' : 'Check the seat around you. ') + 'Make sure to leave nothing behind.';
  }
  function supported() { return Boolean(root.BoothyNative?.available || (root.speechSynthesis && root.SpeechSynthesisUtterance)); }
  function stop() {
    generation++;
    if (settle) { settle(false); settle = null; }
    try { root.speechSynthesis?.cancel(); root.BoothyNative?.stopVoice(); } catch {}
  }
  async function speakText(text, preview = false) {
    if ((!enabled && !preview) || !supported() || !text) return false;
    stop();
    if (root.BoothyNative?.available) return root.BoothyNative.speak(text);
    const current = generation;
    return new Promise(resolve => {
      let finished = false;
      const finish = ok => { if (finished) return; finished = true; clearTimeout(timeout); if (settle === finish) settle = null; resolve(ok); };
      settle = finish;
      const utterance = new root.SpeechSynthesisUtterance(String(text).slice(0, 500));
      const voices = root.speechSynthesis.getVoices();
      const voice = voices.find(v => /^en[-_]NG$/i.test(v.lang)) || voices.find(v => /^en[-_]GB$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-GB'; utterance.rate = .92; utterance.pitch = 1; utterance.volume = 1;
      utterance.onstart = () => finish(current === generation);
      utterance.onerror = () => finish(false);
      const timeout = setTimeout(() => { if (current === generation) root.speechSynthesis.cancel(); finish(false); }, 4000);
      try { root.speechSynthesis.speak(utterance); } catch { finish(false); }
    });
  }
  const api = { message, supported, stop, enabled: () => enabled,
    setEnabled(value) { enabled = Boolean(value); if (!enabled) stop(); try { root.localStorage?.setItem(key, enabled ? 'on' : 'off'); } catch {} },
    speak: (items, arrived = false, preview = false) => speakText(message(items, arrived), preview), speakText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BoothyVoice = api;
})(typeof window === 'object' ? window : globalThis);
