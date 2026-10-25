(function () {
  'use strict';
  const KEY = 'boothy-ride-lab-v1';
  const M = window.BoothyModel;
  let storageOK = true, state;
  try { state = M.restore(localStorage.getItem(KEY)); } catch { state = M.initial(); storageOK = false; }
  let tab = ['ride', 'things', 'reminders', 'parking', 'help'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ride';
  let setupStep = 0, setupDraft = null;
  let phoneTestTimer = null, phoneTestStatus = '';
  let detectionTimer, toastTimer, parkingPrompt = false, capturingParking = false;
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const mini = (name, green = false) => `<span class="mini-icon ${green ? 'green' : ''}">${icon(name)}</span>`;
  const button = (action, text, style = '', extra = '', name = '') => `<button type="button" class="button ${style}" data-action="${action}" ${extra}>${name ? icon(name) : ''}${text}</button>`;
  const clock = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const isReal = () => (state.ride.clockMode || state.config.clockMode) === 'real';
  const tag = (kind, r = state.ride) => `boothy-${r.id || 'ride'}-${kind}${kind === 'before' ? '-' + (r.preArrival?.revision || 0) : ''}`;
  let popupKind = null;
  function closePopup() {
    window.BoothyVoice?.stop();
    window.BoothyDevice?.stopSound();
    const dialog = $('#belongings-popup');
    if (dialog?.open) dialog.close();
    popupKind = null;
  }
  function checklistMarkup() {
    return state.ride.items.map(i => `<button type="button" class="check-item ${i.checked ? 'checked' : ''}" data-action="collect" data-id="${i.id}" aria-pressed="${i.checked}"><span class="check-box">${i.checked ? icon('check') : ''}</span>${escape(i.name)}${i.checked ? '<span class="checked-caption">Got it</span>' : ''}</button>`).join('');
  }
  function showPopup(kind) {
    let dialog = $('#belongings-popup');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'belongings-popup'; dialog.className = 'belongings-popup';
      dialog.setAttribute('aria-labelledby', 'belongings-title');
      document.body.append(dialog);
      dialog.addEventListener('cancel', () => { send('interactReminder'); window.BoothyDevice?.stopSound(); popupKind = null; });
    }
    popupKind = kind;
    dialog.innerHTML = `<p class="eyebrow">BOOTHY REMINDER</p><h2 id="belongings-title">${kind === 'before' ? 'Almost there. Check your things.' : 'Before you leave. Check your things.'}</h2><p class="popup-items">${state.ride.items.map(i => escape(i.name)).join(' · ')}</p><div class="checklist popup-checklist" hidden></div><div class="button-row">${button('popupCheck', 'Check my things', 'primary full')}${kind === 'before' ? button('popupSnooze', 'Remind me in 1 minute', 'outline full') : ''}${button('popupDone', 'Done checking', 'primary full', 'hidden')}${button('popupClose', 'Stop sound & close', 'outline full')}</div>`;
    if (!dialog.open) dialog.showModal();
  }
  function revealChecklist() {
    send('interactReminder');
    window.BoothyVoice?.stop();
    window.BoothyDevice?.stopSound();
    const list = $('#belongings-popup .popup-checklist');
    if (!list) return;
    list.hidden = false; list.innerHTML = checklistMarkup();
    $('#belongings-popup [data-action=popupCheck]').hidden = true;
    $('#belongings-popup [data-action=popupDone]').hidden = false;
    list.querySelector('button')?.focus();
  }
  function openNotification() {
    const route = window.BoothyNotificationRoute?.destination(location.hash, state.ride);
    if (!route) return false;
    closePopup();
    tab = route.view; render();
    history.replaceState(null, '', '#' + tab);
    if (route.checklist) { showPopup(route.checklist); revealChecklist(); }
    else if (route.focusReminder) $('#notice-region').scrollIntoView({ block: 'start' });
    if (route.message) toast(route.message);
    return true;
  }
  function updatePhoneTest() {
    const panel = $('.alert-settings');
    if (!panel) return;
    const status = panel.querySelector('.phone-test-status'); if (status) status.textContent = phoneTestStatus;
    const start = panel.querySelector('[data-action=testPhoneLater]');
    if (start) start.disabled = phoneTestTimer !== null || window.BoothyDevice?.status() !== 'enabled';
    const cancel = panel.querySelector('[data-action=cancelPhoneTest]'); if (cancel) cancel.hidden = phoneTestTimer === null;
  }
  function signal(title, body, kind) {
    if (window.BoothyNative?.ownsAlerts(state.ride)) return;
    window.BoothyDevice?.signal(title, body, tag(kind), { kind, rideId: state.ride.id, voiceText: ['before', 'end'].includes(kind) ? window.BoothyVoice?.message(state.ride.items, kind === 'end') : '' }).then(ok => { if (!ok) toast('An alert channel could not run. Your reminder is visible here. Open Reminders and use Test alert for details.'); });
  }
  function signalChanges(previous) {
    const r = state.ride;
    if (r.preArrival?.status === 'due' && (previous.preArrival?.status !== 'due' || (r.preArrival.repeatCount || 0) > (previous.preArrival?.repeatCount || 0))) signal('Get your belongings ready', `${r.end.message}. ${r.end.reason} Items: ${r.items.map(i => i.name).join(', ')}.`, 'before');
    if (r.trackingWarningSent && !previous.trackingWarningSent) signal('Check your arrival time', 'Live timing has paused. Reconnect location or enter a new time.', 'tracking');
    if (r.transit?.status === 'due' && previous.transit?.status !== 'due') signal(r.transit.message, r.transit.reason, 'transit');
    if (r.etaReached && !previous.etaReached && !(r.preArrival?.status === 'due' && previous.preArrival?.status !== 'due')) signal('Have you arrived?', 'Your estimated arrival time has passed. Confirm arrival or update your estimate.', 'eta');
    if (r.stage === 'arrived' && previous.stage !== 'arrived') signal('Before you leave the vehicle', `${r.end.message}. ${r.end.reason} Collect: ${r.items.map(i => i.name).join(', ')}.`, 'end');
    if (previous.preArrival?.status === 'due' && r.preArrival?.status !== 'due') window.BoothyDevice?.close(tag('before', previous));
    if (previous.transit?.status === 'due' && r.transit?.status !== 'due') window.BoothyDevice?.close(tag('transit', previous));
    if (r.end?.done && !previous.end?.done) window.BoothyDevice?.close(tag('end'));
    if (previous.etaReached && (!r.etaReached || r.stage === 'arrived')) window.BoothyDevice?.close(tag('eta', previous));
    if (r.stage === 'arrived' && previous.stage !== 'arrived') showPopup('end');
    else if (r.preArrival?.status === 'due' && previous.preArrival?.status !== 'due') showPopup('before');
  }
  function updateClockLabels() {
    const seconds = M.remainingSeconds(state.ride);
    const countdown = $('#ride-countdown'); if (countdown) countdown.textContent = clock(seconds);
    const eta = $('#ride-eta'); if (eta) eta.textContent = !M.routeFresh(state.ride) ? 'Live timing paused' : seconds > 0 ? `About ${Math.ceil(seconds / 60)} min left` : 'Estimate reached';
    const alert = $('#arrival-countdown'); if (alert) alert.textContent = seconds > 0 ? `${clock(seconds)} to estimated arrival. Get your belongings ready.` : 'Your arrival estimate has passed. Keep your belongings ready.';
  }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4000);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOK = false; }
    $('#storage-warning').hidden = storageOK;
    window.BoothyNative?.sync(state, window.BoothyDevice?.options(), window.BoothyVoice?.enabled());
  }
  function send(action, data) {
    if (window.BoothyNative?.available) {
      if (action === 'tick') window.BoothyNative.tick();
      else window.BoothyNative.command(action, data || {}).then(ok => { if (!ok) toast('That change could not be saved. Check phone reminder permissions and try again.'); });
      return;
    }
    const previous = state.ride;
    const previousStage = state.ride.stage;
    const previousAlert = state.ride.preArrival?.status;
    state = M.transition(state, action, { nowMs: Date.now(), ...data });
    const tickOnly = action === 'tick' && previous.elapsed === state.ride.elapsed && previous.transit.status === state.ride.transit.status && previous.preArrival.status === state.ride.preArrival.status && previous.preArrival.repeatCount === state.ride.preArrival.repeatCount && previous.etaReached === state.ride.etaReached && previous.trackingWarningSent === state.ride.trackingWarningSent;
    if (tickOnly) { updateClockLabels(); return; }
    save();
    if (state.ride.stage === 'arrived' || ['newRide', 'cancelRide'].includes(action)) window.BoothyLiveMap?.stop();
    if (action === 'tick') {
      // Keep drafts intact when a reminder becomes due while someone is editing.
      $('#notice-region').innerHTML = notices(); $('#context-panel').innerHTML = context();
      if (tab === 'ride' && !document.querySelector('details[open] form[data-form="eta"]')) $('#view').innerHTML = transitView();
      updateClockLabels();
    } else render();
    signalChanges(previous);
    if (previousStage !== 'arrived' && state.ride.stage === 'arrived') {
      tab = 'ride'; location.hash = 'ride'; render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (state.ride.preArrival?.status === 'due' && previousAlert !== 'due') {
      $('#notice-region').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    if (state.ride.stage === 'detecting' && !detectionTimer) {
      detectionTimer = setTimeout(() => { detectionTimer = null; send('detect'); toast('Demo started.'); }, 1600);
    }
  }
  function changeTab(next) {
    $('#app-menu')?.close();
    tab = next; location.hash = next; render();
    $('#main').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  const reason = text => `<div class="reason-box"><small>YOUR ORIGINAL REASON</small><p>${escape(text)}</p></div>`;
  function setupConfig() {
    if (!setupDraft) setupDraft = { ...state.config, clockMode: 'real', transit: { ...state.config.transit, enabled: state.config.transit.enabled === true } };
    return setupDraft;
  }
  function setupProgress() {
    return `<ol class="setup-progress" aria-label="Trip setup"><li ${setupStep === 0 ? 'aria-current="step"' : ''}><span>1</span> Your trip</li><li ${setupStep === 1 ? 'aria-current="step"' : ''}><span>2</span> Your things</li></ol>`;
  }

  function readyView() {
    const c = setupConfig(), demo = c.clockMode === 'simulation';
    if (state.ride.stage === 'detecting') return `<section class="card card-pad"><h2>Starting your demo…</h2>${button('cancelDetection', 'Cancel', 'outline full')}</section>`;
    if (setupStep === 0) return `${setupProgress()}<section class="card card-pad setup-card"><form data-form="setupRoute">
      <label class="field">Where are you going?<input name="destination" value="${escape(c.destination)}" placeholder="e.g. School or Masaka" required maxlength="100" autocomplete="off"></label>
      <label class="field">How many minutes away?<input name="duration" type="number" inputmode="numeric" min="3" max="999" value="${c.duration}" required><span class="field-note">We’ll remind you 3 minutes before this time.</span></label>
      ${demo ? '' : `<div class="map-entry">${button('openTripMap', c.destinationPoint ? 'Change destination pin' : 'Choose on map', 'outline full', '', 'pin')}<p class="field-note">${c.destinationPoint ? 'Destination pin selected.' : 'Optional. You can start with just your time estimate.'}</p></div>`}
      <details class="form-details"><summary>Starting point & parking (optional)</summary>
      <label class="field">Starting point<input name="origin" value="${escape(c.origin)}" maxlength="100" placeholder="Where you are now"></label>
      <label class="field">Travelling as<select name="transport"><option value="passenger" ${c.transport !== 'car' ? 'selected' : ''}>Passenger</option><option value="car" ${c.transport === 'car' ? 'selected' : ''}>Driver</option></select></label>
      <label class="checkbox-label"><input name="saveParking" type="checkbox" ${c.saveParking ? 'checked' : ''}><span>Save a parking note when I arrive</span></label>
      <label class="field">Parking note<input name="parkingNote" value="${escape(c.parkingNote)}" maxlength="160" placeholder="e.g. Near the entrance"></label></details>
      <button class="button primary full" type="submit">Next: your things ${icon('arrow')}</button></form></section>
      ${window.BoothyNative?.available ? '' : demo ? button('exitDemo', 'Use for a real trip', 'text-button') : `<div class="demo-entry">${button('tryDemo', 'Try a demo first', 'text-button')}</div>`}`;
    return `${setupProgress()}<section class="card card-pad setup-card"><form data-form="setupItems">
      <label class="field">What are you taking?<input name="items" value="${escape(c.items.join(', '))}" required maxlength="400" placeholder="Phone, bag, keys"><span class="field-note">Separate items with commas.</span></label>
      <div class="trip-summary"><span>Going to</span><strong>${escape(c.destination)}</strong><span>About ${c.duration} minutes · reminder 3 minutes before arrival</span></div>
      <p class="small-copy">${window.BoothyNative?.available ? (window.BoothyNative.ready() ? "Phone reminders are ready." : "Enable phone reminders in Sound & notifications before starting.") : "Keep Boothy open for timely alerts."}</p><p class="alert-summary">Sound ${window.BoothyDevice?.options().sound ? 'on' : 'off'} · Phone alerts ${window.BoothyDevice?.status() === 'enabled' ? 'on' : 'off'}</p>
      <div class="button-row">${button('setupBack', 'Back', 'outline')}<button type="submit" class="button primary">${demo ? 'Start demo' : 'Start ride'} ${icon('arrow')}</button></div>
      </form></section><button class="text-button" data-tab="reminders">Sound & notification settings ${icon('arrow')}</button>`;
  }

  function transitView() {
    const r = state.ride, real = r.clockMode === 'real', remaining = Math.ceil(M.remainingSeconds(r) / 60);
    const checked = r.items.filter(i => i.checked).length;
    return `<section class="card card-pad active-trip"><div class="card-top"><span class="section-label">${real ? 'ON YOUR WAY' : 'DEMO TRIP'}</span><span class="pill">${checked}/${r.items.length} items ready</span></div>
      <span class="trip-emblem">${icon("bag")}</span><h2 class="destination-title">${escape(r.destination)}</h2>
      <p class="arrival-estimate">${real ? `<strong id="ride-eta">${!M.routeFresh(r) ? 'Live timing paused' : remaining > 0 ? 'About ' + remaining + ' min left' : 'Estimate reached'}</strong>` : `<strong>${remaining} demo minutes left</strong>`}</p>
      <p class="small-copy">${real ? (r.needsResume ? 'Your trip time needs checking. Enter a new time below to resume reminders.' : r.etaSource === 'route' ? (M.routeFresh(r) ? 'Updated from your road route.' : 'Reconnect location or enter a new time below. Arrival warnings are paused.') : 'Your time estimate.') : 'Use the controls below to preview the reminders.'}</p>
      <div class="timing-strip"><span>3-min warning</span><span>1-min snooze</span></div>
      ${button('arrive', real ? 'I’ve arrived' : 'Preview arrival', 'primary full', '', 'pin')}
      ${real ? `<div class="trip-secondary">${button('openTripMap', 'Open live map', 'outline full', '', 'pin')}</div>` : ''}
      <div class="trip-secondary">${button('openChecklist', 'Check my things', 'outline full', '', 'bag')}</div>
      <details class="form-details"><summary>Taking longer? Change the time</summary><form data-form="eta"><label class="field">Minutes left<input name="minutes" type="number" inputmode="numeric" min="1" max="999" value="${Math.max(1, remaining)}" required></label><button type="submit" class="button outline full">Update time</button></form></details>
      ${real ? '' : `<div class="simulation-controls"><div class="button-row">${button('advance', 'Skip 1 minute', 'outline')}${remaining > 3 ? button('nearArrival', 'Preview arrival reminder', 'outline') : ''}</div></div>`}</section>
      <details class="form-details"><summary>Trip details</summary><p class="small-copy">${escape(r.origin)} → ${escape(r.destination)}</p>${eventLog()}${button('confirmCancel', 'Cancel this trip', 'text-button danger-action')}</details>`;
  }

  function eventLog() {
    if (!state.ride.events.length) return '';
    return `<details class="card card-pad"><summary style="font-size:12px;cursor:pointer">Trip activity · ${state.ride.events.length} events</summary><ul class="timeline">${state.ride.events.map(e => `<li><time>${String(e.minute).padStart(2, '0')} min</time><span>${escape(e.message)}</span></li>`).join('')}</ul></details>`;
  }
  function arrivalView() {
    const r = state.ride, count = r.items.filter(i => i.checked).length;
    const completed = r.end.done && count === r.items.length && r.transit.status !== 'due';
    if (completed) return `<section class="card card-pad complete-trip"><span class="completion-mark">${icon('check')}</span><h2>All your things are with you.</h2><p class="small-copy">${escape(r.destination)}</p>${button('newRide', 'Start another trip', 'primary full')}</section>`;
    return `<section class="card card-pad"><div class="card-top"><span class="section-label">YOU’VE ARRIVED</span><span class="pill">${count}/${r.items.length} collected</span></div><h2 class="destination-title">Got everything?</h2><p class="small-copy">Tick each item once it’s with you.</p>
      <div class="checklist">${checklistMarkup()}</div>
      ${button('finishTrip', 'Finish trip', 'primary full', count !== r.items.length ? 'disabled' : '')}
      ${r.transit.status === 'due' ? '<p class="small-copy">You also have a reminder to handle above.</p>' : ''}
      ${r.saveParking && state.parking ? '<button class="text-button" data-tab="parking">View saved parking '+icon('arrow')+'</button>' : ''}
      <details class="form-details"><summary>Your arrival reminder</summary><p class="small-copy">${escape(r.end.message)}<br>${escape(r.end.reason)}</p></details></section>`;
  }

  function remindersView() { return alertOptions(); }
  function thingsView() {
    const c = state.config, enabled = c.transit.enabled === true;
    const active = ['inTransit', 'arrived'].includes(state.ride.stage);
    const items = active ? state.ride.items.map(i => i.name) : setupConfig().items;
    return `<section class="card card-pad"><h2>Your belongings</h2><form data-form="belongings"><label class="field">What are you taking?<input name="items" value="${escape(items.join(', '))}" maxlength="400" required><span class="field-note">Separate items with commas. Up to 12.</span></label><button class="button primary full" type="submit">Save my things</button></form></section>
    <details class="card card-pad optional-reminders"><summary>Another reminder along the way</summary><form data-form="extraReminder"><label class="checkbox-label"><input type="checkbox" name="enabled" data-extra-reminder ${enabled ? 'checked' : ''}><span>Add an extra reminder</span></label><fieldset ${enabled ? '' : 'disabled'}><label class="field">Remind me to<input name="transitMessage" value="${escape(c.transit.message)}" required maxlength="140" placeholder="e.g. Call someone"></label><label class="field">Why?<input name="transitReason" value="${escape(c.transit.reason)}" required maxlength="280"></label><label class="field">Minutes after starting<input name="at" type="number" min="1" max="999" value="${c.transit.at}" required></label></fieldset><button type="submit" class="button outline full">Save reminder</button></form></details>`;
  }
  function helpView() {
    return `<section class="card card-pad"><h2>One trip. Three steps.</h2><ol class="help-list"><li>Set your destination and arrival estimate.</li><li>Add the things you’re taking.</li><li>Start the ride. When Boothy reminds you, check each item before leaving.</li></ol></section>
    <section class="card card-pad"><h2>About your reminders</h2><p class="small-copy">The first warning is 3 minutes before your estimate. The tone lasts 15 seconds. If you don’t respond, it repeats once after a minute. Opening the checklist or stopping the sound cancels that repeat.</p><p class="small-copy">Snooze gives you 1 more minute. You confirm when you’ve arrived.</p><details class="form-details"><summary>Location, privacy & background use</summary><p class="small-copy">The browser version needs to stay open for timely reminders. A map pin alone does not change your arrival time. When road routing is connected, the app labels route estimates separately.</p><p class="small-copy">Trip details and parking stay on this device. Opening a map shares the viewed area with its map provider. Live routing sends your position and destination to the route provider only when you turn it on. You can stop location at any time.</p><p class="small-copy">Voice uses your phone’s available voice and audio output. Try it with your headphones before a trip. Phone settings control volume, banners and Do Not Disturb.</p></details></section>
    <a class="button outline full" href="mailto:alabivictordaniel@gmail.com?subject=Boothy%20feedback">Send Victor feedback ${icon('arrow')}</a>`;
  }
  function alertOptions() {
    const device = window.BoothyDevice;
    const prefs = device?.options() || {}, capabilities = device?.capabilities() || {};
    const notificationStatus = device?.status() || 'unavailable';
    return `<section class="card card-pad alert-settings"><div class="section-title">${mini('bell')}<div><h2>Sound & notifications</h2></div></div>
      <label class="checkbox-label"><input type="checkbox" data-alert="sound" ${prefs.sound ? 'checked' : ''} ${capabilities.sound ? '' : 'disabled'}><span>Play a reminder tone · 15 seconds${capabilities.sound ? '' : ' · unavailable here'}</span></label>
      <label class="field">Reminder tone<select data-tone aria-label="Reminder tone">${(window.BoothyDevice?.tones() || []).map(t => `<option value="${t.id}" ${prefs.tone === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
      <label class="checkbox-label"><input type="checkbox" data-alert="vibration" ${prefs.vibration ? 'checked' : ''} ${capabilities.vibration ? '' : 'disabled'}><span>Vibrate${capabilities.vibration ? ' on supported devices' : ' · unavailable here'}</span></label>
      <div class="button-row">${button('notifications', window.BoothyNative?.available ? 'Check phone permissions' : notificationStatus === 'enabled' ? 'Turn phone alerts off' : 'Enable phone alerts', 'outline small', !window.BoothyNative?.available && (notificationStatus === 'unavailable' || notificationStatus === 'blocked') ? 'disabled' : '', 'bell')}${button('testAlert', 'Test alert', 'outline small', '', 'check')}${button('stopSound', 'Stop sound', 'outline small')}</div>
      ${window.BoothyNative?.available ? `<div class="native-readiness"><p class="small-copy">${window.BoothyNative.ready() ? 'Android reminders are enabled.' : 'Allow alarms and notifications so Boothy can remind you with the screen locked.'}</p>${button('nativePermissions', 'Set up phone reminders', 'outline full')}</div>` : ''}
      <p class="status-caption">${notificationStatus === 'enabled' ? 'Phone notifications are enabled.' : notificationStatus === 'blocked' ? 'Phone alerts are blocked. Enable notifications in phone or browser settings.' : notificationStatus === 'unavailable' ? 'Phone alerts are unavailable in this browser. On iPhone, open Boothy from a Home Screen app to check support.' : 'Phone alerts ask for permission only when you enable them.'} ${window.BoothyNative?.available ? "Android schedules these reminders. Reopen Boothy after restarting your phone or force-stopping the app." : "Keep this browser page open for timely alerts."}</p>
      <div class="divider"></div><label class="checkbox-label"><input type="checkbox" data-voice ${window.BoothyVoice?.enabled() ? 'checked' : ''} ${window.BoothyVoice?.supported() ? '' : 'disabled'}><span>Speak my belongings reminder</span></label><p class="small-copy">${window.BoothyVoice?.supported() ? 'Uses your phone’s current audio output. Try it with your headphones.' : 'Voice isn’t available on this device.'}</p><div class="button-row">${button('testVoice', 'Preview voice', 'outline small', window.BoothyVoice?.supported() ? '' : 'disabled')}${button('stopVoice', 'Stop voice', 'outline small')}</div><p class="status-caption voice-status" role="status"></p>
      ${window.BoothyNative?.available ? `<details class="form-details"><summary>Reminder diagnostics</summary>${button("nativeDiagnostics","Show recent checks","outline full")}<p class="status-caption native-diagnostics" role="status"></p></details>` : ""}
      <details class="form-details notification-diagnostics"><summary>Test phone notifications</summary>
      <p class="small-copy">${window.BoothyNative?.available ? "Schedule a test, then lock your screen. Android will trigger it in 20 seconds using your selected tone and vibration settings." : "Send a test in 20 seconds, then switch apps or lock your screen. Keep this tab open. Your phone controls the notification sound and banner."}</p>
      <div class="button-row">${button('testPhoneLater', 'Test phone alert in 20 seconds', 'outline full', notificationStatus !== 'enabled' || phoneTestTimer !== null ? 'disabled' : '')}${button('cancelPhoneTest', 'Cancel test', 'outline small', phoneTestTimer === null ? 'hidden' : '')}</div>
      <p class="status-caption phone-test-status" role="status" aria-live="polite">${escape(phoneTestStatus)}</p>
      <details class="form-details"><summary>No banner? Check these settings</summary><p class="small-copy">1. In Chrome, open this site’s page information → Permissions → Notifications → Allow. Then enable phone alerts above.</p><p class="small-copy">2. In Android Settings → Apps → Chrome (or Boothy) → Notifications, allow notifications and choose an alerting category. Enable “Pop on screen” or “Floating notifications” if available. Names vary by phone.</p><p class="small-copy">3. Check Do Not Disturb. Pull down the notification tray: an alert may be there even without a banner.</p><p class="small-copy">${window.BoothyNative?.available ? "This test uses Android’s alarm system. Diagnostics show whether Android received the alarm and started playback; you still need to confirm that you heard it." : "This test uses the open page’s timer. A delayed or missing test means background delivery is not yet proven on your phone."}</p></details></details></section>`;
  }
  function dateLabel(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 'Saved on this device' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function parkingView() {
    const p = state.parking;
    const gps = p?.coords;
    return `${p ? `<section class="card"><div class="card-pad"><div class="card-top"><span class="section-label">YOUR LAST SAVED SPOT</span><span class="pill ${gps ? '' : 'neutral'}">${gps ? 'GPS saved' : p.source === 'simulation' ? 'Simulated spot' : 'Location note'}</span></div><h2 class="reminder-message">${escape(p.location)}</h2><p class="help">${escape(p.note) || 'No additional note.'}</p>${button('parkingPrompt', 'Remind me where I parked', 'dark full', '', 'pin')}
      ${gps ? `<p class="gps-detail">${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} · accuracy ±${Math.round(gps.accuracy)} m</p><a class="button outline full" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(gps.lat + ',' + gps.lng)}&travelmode=walking" target="_blank" rel="noopener noreferrer">${icon('arrow')}Walking directions in Maps</a>${gps.accuracy > 80 ? '<p class="small-copy">The GPS fix is broad. Keep a landmark or bay number in your note, or capture again outdoors.</p>' : ''}` : '<p class="small-copy">This is a text note, not a measured GPS position. Capture your current spot below if you’re beside your car.</p>'}
      <p class="saved-time">Saved ${escape(dateLabel(p.savedAt))}. Kept between rides and page reloads.</p></div></section>` : `<section class="card empty-state">${mini('pin', true)}<h2>A spot worth remembering.</h2><p>Save a location note, or capture your current GPS spot when you’re beside your car.</p>${button('goRide', 'Go to your ride', 'outline', '', 'arrow')}</section>`}
      <section class="card form-card"><div class="section-title">${mini('edit', true)}<div><h2>${p ? 'Update your parking note' : 'Save a parking note'}</h2><p class="small-copy">Keep enough detail to find your car.</p></div></div><form data-form="parking">
      <label class="field">Location<input name="location" value="${escape(p?.location || '')}" placeholder="e.g. Impact Hub, Abuja" required maxlength="100"></label>
      <label class="field">How will I find it?<textarea name="note" maxlength="160" placeholder="e.g. Front entrance, space B12">${escape(p?.note || '')}</textarea></label>
      <button class="button outline full" type="submit">Save parking note</button></form><div class="divider"></div>${button('captureParking', capturingParking ? 'Capturing location…' : 'Save my current GPS spot', 'dark full', capturingParking ? 'disabled' : '', 'pin')}<p class="status-caption">Location permission is requested only when you tap this button. GPS coordinates stay on this device; opening Maps shares that saved spot with Google Maps.</p></section>`;
  }
  function notices() {
    const r = state.ride;
    let result = '';
    if (r.stage === 'inTransit' && r.preArrival?.status === 'due') {
      const remaining = Math.ceil(M.remainingSeconds(r) / 60);
      result += `<section class="reminder-alert pre-arrival-alert" role="alert"><h2 class="reminder-message">Almost there. Get your things ready.</h2>${button('openChecklist', 'Check my things', 'primary full', '', 'bag')}</section>`;
    }
    if (r.stage === 'inTransit' && r.clockMode === 'real' && r.etaReached) result += `<section class="reminder-alert" role="alert"><span class="section-label">ARRIVAL CHECK</span><h2 class="reminder-message">Have you arrived?</h2><p class="help">Your estimated arrival time has passed.</p>${button('arrive', 'Yes · check my belongings', 'dark full', '', 'bag')}</section>`;
    if (r.transit?.status === 'due') result += `<section class="reminder-alert"><div class="card-top"><span class="section-label">${r.stage === 'arrived' ? 'UNHANDLED IN-TRANSIT REMINDER' : 'IN-TRANSIT REMINDER'}</span><span class="pill orange">Now due · ${r.transit.at} min</span></div><h2 class="reminder-message">${escape(r.transit.message)}</h2>${reason(r.transit.reason)}<div class="button-row">${button('ackTransit', 'Done', 'primary', '', 'check')}${r.stage === 'inTransit' ? button('snooze', 'Snooze 1 min', 'outline', '', 'clock') : ''}</div></section>`;
    if (parkingPrompt && state.parking) result += `<section class="reminder-alert"><div class="card-top"><span class="section-label">PARKING REMINDER</span><span class="pill neutral">Your saved note</span></div><h2 class="reminder-message">Your car is at ${escape(state.parking.location)}.</h2>${reason(state.parking.note || 'You saved this location so you could find your car after the ride.')}${button('dismissParking', 'Got it', 'outline', '', 'check')}</section>`;
    return result;
  }
  function context() { return ''; }

  function render() {
    const focus = document.activeElement;
    const action = focus?.dataset?.action, itemId = focus?.dataset?.id;
    const titles = {
      ride: ['YOUR TRAVEL COMPANION', state.ride.stage === 'inTransit' ? 'Your trip' : state.ride.stage === 'arrived' ? 'Before you go' : 'Take the ride. Keep your things.', state.ride.stage === 'ready' ? 'A timely reminder before you step out.' : ''],
      things: ['', 'Your things, remembered.', ''],
      help: ['', 'A little help.', ''],
      reminders: ['', 'Make it your reminder.', ''],
      parking: ['', 'Your parking spot', '']
    };
    const title = titles[tab] || titles.ride;
    $('#main').dataset.screen = tab === 'ride' ? state.ride.stage : tab;
    const mode = $('#mode-notice');
    if (mode) { mode.hidden = true; mode.innerHTML = `<span class="simulation-dot"></span><strong>${isReal() ? 'Ride timer mode' : 'Simulation mode'}</strong><span>${isReal() ? 'Your manual arrival estimate · keep Boothy open for timely alerts.' : 'Trips and locations are simulated. Test every state at your pace.'}</span>`; }
    $('#page-eyebrow').textContent = title[0]; $('#page-title').textContent = title[1]; $('#page-subtitle').textContent = title[2];
    document.querySelectorAll('.nav-item').forEach(el => { el.classList.toggle('active', el.dataset.tab === tab); if (el.dataset.tab === tab) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    $('#notice-region').innerHTML = notices();
    $('#view').innerHTML = tab === 'reminders' ? remindersView() : tab === 'things' ? thingsView() : tab === 'help' ? helpView() : tab === 'parking' ? parkingView() : state.ride.stage === 'inTransit' ? transitView() : state.ride.stage === 'arrived' ? arrivalView() : readyView();
    $('#context-panel').innerHTML = context();
    $('#storage-warning').hidden = storageOK;
    if (action && !focus?.closest('#belongings-popup')) document.querySelector(`[data-action="${action}"]${itemId !== undefined ? `[data-id="${itemId}"]` : ''}`)?.focus({ preventScroll: true });
  }
  document.addEventListener('click', async e => {
    const navigation = e.target.closest('[data-tab]');
    if (navigation) { changeTab(navigation.dataset.tab); return; }
    const themeChoice = e.target.closest('[data-theme-choice]');
    if (themeChoice) { window.BoothyTheme?.set(themeChoice.dataset.themeChoice); return; }
    const control = e.target.closest('[data-action]');
    if (!control) return;
    const a = control.dataset.action;
    if (a === 'openMenu') { window.BoothyTheme?.sync(); $('#app-menu').showModal(); return; }
    if (a === 'closeMenu') { $('#app-menu').close(); return; }
    if (a === 'nativeDiagnostics') { const entries=await window.BoothyNative?.diagnostics(); const out=$('.native-diagnostics'); if(out) out.textContent=Array.isArray(entries) ? entries.slice(0,12).map(e=>new Date(e.time).toLocaleTimeString()+' · '+e.event).join(' / ') : 'Could not load diagnostics.';return; }
    if (a === 'nativePermissions') { window.BoothyNative?.requestPermissions(); return; }
    if (a === 'testVoice') {
      const result = $('.voice-status'); if (result) result.textContent = 'Starting voice…';
      const items = state.ride.items || setupConfig().items.map(name => ({ name, checked: false }));
      const ok = await window.BoothyVoice?.speak(items, false, true);
      if (result?.isConnected) result.textContent = ok ? 'Voice started. Check your speaker or connected headphones.' : 'Voice could not start. Check your device’s speech and volume settings.';
      return;
    }
    if (a === 'stopVoice') { window.BoothyVoice?.stop(); return; }
    if (a === 'confirmCancel') {
      let dialog = $('#cancel-trip');
      if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'cancel-trip'; dialog.className = 'belongings-popup'; dialog.setAttribute('aria-labelledby', 'cancel-title'); document.body.append(dialog); }
      dialog.innerHTML = `<h2 id="cancel-title">Cancel this trip?</h2><p class="small-copy">This stops its reminders and location tracking.</p><div class="button-row">${button('keepTrip','Keep trip','outline')}${button('cancelRide','Cancel trip','primary')}</div>`; dialog.showModal(); return;
    }
    if (a === 'keepTrip') { $('#cancel-trip')?.close(); return; }
    if (a === 'cancelRide') { $('#cancel-trip')?.close(); closePopup(); setupDraft = null; setupStep = 0; send('cancelRide'); return; }
    if (a === 'openTripMap') {
      const active = state.ride.stage === 'inTransit' && state.ride.clockMode === 'real';
      const c = active ? state.ride : setupConfig();
      await window.BoothyLiveMap?.open({ point: c.destinationPoint, keepTracking: active, rideId: active ? state.ride.id : '', onRoute(result) { if (state.ride.id === result.rideId) send('updateRouteEta', result); }, onRouteStatus(status) { if (status !== 'live' && state.ride.stage === 'inTransit') send('pauseRoute'); }, onStopRoute() { if (state.ride.stage === 'inTransit' && state.ride.etaSource === 'route') send('pauseRoute'); }, onSelect(point, label) {
        if (active && state.ride.stage === 'inTransit') send('setDestinationPoint', { point });
        else { const draft = setupConfig(); draft.destinationPoint = point; if (label) draft.destination = label; if (!draft.destination.trim()) draft.destination = 'Pinned destination'; render(); }
        toast(active ? 'Destination pin saved.' : 'Destination pin selected.');
      } }); return;
    }
    if (a === 'setupBack') { setupStep = 0; render(); return; }
    if (a === 'tryDemo') { setupDraft = { ...state.config, clockMode: 'simulation', destination: 'Demo destination', origin: 'Demo start', duration: 5, items: ['Phone', 'Bag'], transit: { ...state.config.transit, enabled: false } }; setupStep = 0; render(); return; }
    if (a === 'exitDemo') { setupDraft = null; setupStep = 0; render(); return; }
    if (a === 'finishTrip') {
      if (!state.ride.items.every(i => i.checked)) return;
      if (state.ride.transit.status === 'due') { toast('Handle the extra reminder above first.'); return; }
      closePopup(); send('ackEnd'); return;
    }
    if (a === 'newRide') { setupStep = 0; setupDraft = null; }
    if (a === 'stopSound') { send('interactReminder'); window.BoothyVoice?.stop(); window.BoothyDevice?.stopSound(); toast('Sound stopped.'); return; }
    if (a === 'popupDone') { const kind = popupKind; closePopup(); send(kind === 'end' ? 'ackEnd' : 'ackPreArrival'); return; }
    if (a === 'popupClose') { send('interactReminder'); closePopup(); return; }
    if (a === 'openChecklist') { showPopup(state.ride.stage === 'arrived' ? 'end' : 'before'); revealChecklist(); return; }
    if (a === 'popupCheck') {
      revealChecklist(); return;
    }
    if (a === 'popupSnooze') { closePopup(); send('snoozePreArrival'); toast(isReal() ? 'I’ll remind you in 1 minute.' : 'Snoozed. Advance 1 minute to test it.'); return; }
    if (a === 'toggleTheme') { window.BoothyTheme?.toggle(); return; }
    if (a === 'chooseClock' && state.ride.stage === 'ready') {
      send('configure', { config: { ...state.config, clockMode: control.dataset.value === 'real' ? 'real' : 'simulation' } }); return;
    }
    if (a === 'cancelPhoneTest') {
      window.BoothyNative?.cancelTest();
      clearTimeout(phoneTestTimer); phoneTestTimer = null; phoneTestStatus = 'Test cancelled.'; updatePhoneTest(); return;
    }
    if (a === 'testPhoneLater') {
      if (phoneTestTimer !== null) return;
      if (window.BoothyDevice?.status() !== 'enabled') { toast('Enable phone alerts first.'); return; }
      if (window.BoothyNative?.available) { const ok=await window.BoothyNative.testLater(); if(ok)phoneTestTimer=setTimeout(()=>{phoneTestTimer=null;updatePhoneTest();},22000); phoneTestStatus=ok ? 'Android scheduled the test. Lock your screen now, then check sound, vibration and the notification tray.' : 'Enable alarms and notifications first.';updatePhoneTest();return; }
      const expectedAt = Date.now() + 20000;
      phoneTestStatus = 'Test set. Switch apps now, or lock your screen. Keep Boothy’s tab open.';
      phoneTestTimer = setTimeout(async () => {
        // Clear the pending state only once the delivery request has settled.
        let result;
        try { result = await window.BoothyDevice.testPhone(); } catch { result = 'failed'; }
        phoneTestTimer = null;
        const late = Date.now() - expectedAt > 5000;
        phoneTestStatus = result === 'requested' ? (late ? 'The test was requested late; the browser may have paused Boothy. Check your notification tray.' : 'Phone notification requested. Check for a banner or pull down the notification tray. Delivery is not yet confirmed.') : result === 'blocked' ? 'Notifications are blocked. Check the settings below.' : result === 'off' ? 'Phone alerts are off. Enable them and try again.' : 'The phone notification could not be requested. Check permission and try again.';
        updatePhoneTest();
      }, 20000);
      updatePhoneTest(); return;
    }
    if (a === 'notifications') {
      let status;
      try { status = await window.BoothyDevice?.toggleNotifications(); } catch { toast('Notification permission could not be requested. Check the settings below.'); return; }
      toast(status === 'enabled' ? (window.BoothyNative?.available ? 'Android notifications are enabled.' : 'Phone alerts enabled. Keep Boothy open for the ride timer.') : status === 'off' ? 'Phone alerts are off.' : status === 'blocked' ? 'Notification access is blocked. In-app alerts are still on.' : 'Phone alerts are unavailable in this browser.');
      const panel = document.querySelector('.alert-settings'); if (panel) panel.outerHTML = alertOptions(); else render(); return;
    }
    if (a === 'testAlert') {
      const panel = control.closest('.alert-settings');
      let result = panel?.querySelector('.alert-test-result');
      if (!result && panel) {
        result = document.createElement('p'); result.className = 'status-caption alert-test-result';
        result.setAttribute('role', 'status'); result.setAttribute('aria-live', 'polite'); panel.append(result);
      }
      control.disabled = true;
      if (result) result.textContent = 'Testing your selected alerts…';
      try {
        const report = await window.BoothyDevice?.test();
        if (!report || typeof report !== 'object') throw new Error('Reload required');
        const labels = { off: 'off', started: 'playback started', requested: 'requested from your phone', unavailable: 'unavailable here', blocked: 'blocked by your browser', failed: 'could not start' };
        const summary = `Sound: ${labels[report.sound] || 'unknown'}. Vibration: ${labels[report.vibration] || 'unknown'}. Phone notification: ${labels[report.notification] || 'unknown'}.`;
        const allOff = Object.values(report).every(value => value === 'off');
        const guidance = allOff ? 'Turn on sound or vibration above, then test again.' : 'Did you hear or feel it? If not, check media volume, silent/Do Not Disturb settings and connected headphones. A browser request cannot confirm that you heard or felt an alert.';
        if (result) result.textContent = `${summary} ${guidance}`;
        else toast(`${summary} ${guidance}`);
      } catch {
        const message = 'The alert test could not finish. Reload Boothy and try again.';
        if (result) result.textContent = message; else toast(message);
      } finally { control.disabled = false; }
      return;
    }
    if (a === 'captureParking') {
      if (capturingParking) return;
      const form = document.querySelector('form[data-form="parking"]');
      const locationText = form?.elements.namedItem('location').value.trim() || state.parking?.location || 'My parking spot';
      const note = form?.elements.namedItem('note').value.trim() || state.parking?.note || '';
      capturingParking = true; control.disabled = true; control.textContent = 'Capturing location…';
      try { const coords = await window.BoothyDevice.captureParking(); send('captureParking', { coords, location: locationText, note }); toast('GPS parking spot saved with its accuracy.'); }
      catch (error) { toast(error.message); }
      finally {
        capturingParking = false;
        const captureButton = document.querySelector('[data-action="captureParking"]');
        if (captureButton) { captureButton.disabled = false; captureButton.innerHTML = icon('pin') + 'Save my current GPS spot'; }
      }
      return;
    }
    if (a === 'goRide') { changeTab('ride'); return; }
    if (a === 'parkingPrompt' || a === 'dismissParking') { parkingPrompt = a === 'parkingPrompt'; render(); if (parkingPrompt) $('#notice-region').scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (a === 'cancelDetection') { clearTimeout(detectionTimer); detectionTimer = null; }
    if (a === 'depart') window.BoothyDevice?.unlockAudio();
    if (['ackTransit', 'ackPreArrival', 'ackEnd', 'snooze', 'arrive', 'newRide'].includes(a)) window.BoothyDevice?.stopSound();
    const wasChecked = a === 'collect' && state.ride.items?.find(i => i.id === Number(control.dataset.id))?.checked;
    send(a, { id: control.dataset.id });
    if (a === 'collect') {
      const item = state.ride.items?.find(i => i.id === Number(control.dataset.id));
      if (item?.checked && !wasChecked) window.BoothyDevice?.confirmItem();
      const list = $('#belongings-popup .popup-checklist');
      if (list && !list.hidden) { list.innerHTML = checklistMarkup(); list.querySelector(`[data-id="${control.dataset.id}"]`)?.focus(); }
    }
    if (a === 'newRide') toast('Ready for your next trip.');
    if (a === 'snooze') toast(isReal() ? 'Snoozed for 1 minute.' : 'Snoozed. Advance 1 minute to see the same reminder again.');
  });
  document.addEventListener('submit', async e => {
    const form = e.target.closest('[data-form]');
    if (!form) return;
    e.preventDefault();
    if (!form.reportValidity()) return;
    const f = name => form.elements.namedItem(name);
    const text = name => f(name).value.trim();
    const requireText = name => {
      if (text(name)) return true;
      f(name).setCustomValidity('Please enter a message, not just spaces.'); f(name).reportValidity(); return false;
    };
    if (form.dataset.form === 'setupRoute') {
      if (!requireText('destination')) return;
      setupDraft = { ...setupConfig(), destination: text('destination'), duration: Number(f('duration').value), origin: text('origin') || 'Starting point', transport: f('transport').value, saveParking: f('saveParking').checked, parkingNote: text('parkingNote') };
      setupStep = 1; render(); $('#view input')?.focus();
    } else if (form.dataset.form === 'belongings') {
      const items = [...new Set(text('items').split(',').map(i => i.trim().slice(0, 50)).filter(Boolean))].slice(0,12);
      if (!items.length) { f('items').setCustomValidity('Add at least one item.'); f('items').reportValidity(); return; }
      send('updateItems', { items }); if (setupDraft) setupDraft.items = items; toast('Your things are saved.');
    } else if (form.dataset.form === 'setupItems') {
      const items = [...new Set(text('items').split(',').map(i => i.trim()).filter(Boolean))].slice(0, 12);
      if (!items.length) { f('items').setCustomValidity('Add at least one item.'); f('items').reportValidity(); return; }
      if (window.BoothyNative?.available && setupConfig().clockMode === 'real' && !window.BoothyNative.ready()) { toast('Set up phone reminders from the menu first.'); changeTab('reminders'); return; }
      window.BoothyDevice?.unlockAudio();
      send('configure', { config: { ...setupConfig(), items } });
      send('depart');
    } else if (form.dataset.form === 'extraReminder') {
      const enabled = f('enabled').checked;
      if (enabled && !['transitMessage', 'transitReason'].every(requireText)) return;
      const transit = { ...state.config.transit, enabled, ...(enabled ? { message: text('transitMessage'), reason: text('transitReason'), at: Number(f('at').value) } : {}) };
      send('configure', { config: { ...state.config, transit }, updateTransit: state.ride.stage === 'inTransit' });
      if (setupDraft) setupDraft.transit = transit;
      toast('Reminder saved.');
    } else if (form.dataset.form === 'trip') {
      if (state.ride.stage !== 'ready' || !['origin', 'destination'].every(requireText)) return;
      send('configure', { config: { ...state.config, origin: text('origin'), destination: text('destination'), duration: Number(f('duration').value), transport: f('transport').value, saveParking: f('saveParking').checked, parkingNote: text('parkingNote') } });
      toast('Route and parking details saved.');
    } else if (form.dataset.form === 'reminders') {
      if (!['transitMessage', 'transitReason', 'endMessage', 'endReason', 'items'].every(requireText)) return;
      const items = [...new Set(text('items').split(',').map(i => i.trim()).filter(Boolean))].slice(0, 12);
      if (!items.length) { f('items').setCustomValidity('Add at least one belonging.'); f('items').reportValidity(); return; }
      send('configure', { config: { ...state.config, items, transit: { message: text('transitMessage'), reason: text('transitReason'), at: Number(f('at').value) }, end: { message: text('endMessage'), reason: text('endReason') } }, updateTransit: state.ride.stage === 'inTransit' });
      toast('Reminders saved with their original reasons.'); changeTab('ride');
    } else if (form.dataset.form === 'eta') {
      window.BoothyGoogleMap?.stopRouting(); send('updateEta', { minutes: Number(f('minutes').value) }); toast('Time updated.');
    } else if (form.dataset.form === 'parking') {
      if (!requireText('location')) return;
      send('saveParking', { location: text('location'), note: text('note') }); parkingPrompt = false; render(); toast('Parking note saved on this device.');
    }
  });
  document.addEventListener('input', e => { if (e.target.closest('[data-form=setupRoute]') && e.target.name) { if (e.target.name === 'destination') delete setupConfig().destinationPoint; setupConfig()[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.name === 'duration' ? Number(e.target.value) : e.target.value; } if (e.target.name === 'items' && e.target.closest('[data-form=setupItems]')) setupConfig().items = e.target.value.split(','); if (e.target.setCustomValidity) e.target.setCustomValidity(''); });
  document.addEventListener('change', e => {
    if (e.target.matches('[data-voice]')) window.BoothyVoice?.setEnabled(e.target.checked);
    if (e.target.matches('[data-extra-reminder]')) e.target.closest('form').querySelector('fieldset').disabled = !e.target.checked;
    if (e.target.matches('[data-tone]')) window.BoothyDevice?.setOption('tone', e.target.value);
    if (e.target.dataset.alert) window.BoothyDevice?.setOption(e.target.dataset.alert, e.target.checked);
    window.BoothyNative?.sync(state, window.BoothyDevice?.options(), window.BoothyVoice?.enabled());
  });
  function syncClock() {
    if (state.ride.clockMode === 'real' && state.ride.stage === 'inTransit') send('tick', { nowMs: Date.now() });
  }
  document.addEventListener('boothynativestate', event => {
    const restored=M.restore(event.detail), previous=state.ride;
    const meaningful=JSON.stringify({...previous,clockAt:0,elapsed:0})!==JSON.stringify({...restored.ride,clockAt:0,elapsed:0});
    const configChanged=JSON.stringify(state.config)!==JSON.stringify(restored.config)||JSON.stringify(state.parking)!==JSON.stringify(restored.parking);
    state=restored;
    if(previous.id===state.ride.id && state.ride.items?.some(i=>i.checked&&previous.items?.some(old=>old.id===i.id&&!old.checked)))window.BoothyDevice?.confirmItem();
    try { localStorage.setItem(KEY,JSON.stringify(state)); } catch {}
    if(meaningful||configChanged)render();else updateClockLabels();
    if(previous.stage!==state.ride.stage&&['arrived','ready'].includes(state.ride.stage))window.BoothyLiveMap?.stop();
    if(state.ride.stage==='arrived'&&previous.stage!=='arrived')showPopup('end');
    else if(state.ride.preArrival?.status==='due'&&previous.preArrival?.status!=='due')showPopup('before');
    const list=$('#belongings-popup .popup-checklist');if(list&&!list.hidden&&state.ride.items)list.innerHTML=checklistMarkup();
  });
  document.addEventListener('boothynativecapabilities',()=>{if(tab==='reminders')render();});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncClock(); });
  window.addEventListener('storage', e => {
    if (!window.BoothyNative?.available && e.key === KEY && e.newValue) { state = M.restore(e.newValue); render(); syncClock(); }
  });
  window.addEventListener('hashchange', () => { if (openNotification()) return; const next = location.hash.slice(1); if (['ride', 'things', 'reminders', 'parking', 'help'].includes(next) && next !== tab) { tab = next; render(); } });
  window.BoothyBack=()=>{const dialog=document.querySelector('dialog[open]');if(!dialog)return false;if(dialog.id==='belongings-popup'){send('interactReminder');closePopup();}else dialog.close();return true;};
  window.BoothyTheme?.sync();
  const nativeSaved = window.BoothyNative?.restore();
  if (nativeSaved) state = M.restore(nativeSaved);
  else window.BoothyNative?.init(state,window.BoothyDevice?.options(),window.BoothyVoice?.enabled());
  render();
  if (state.ride.stage === 'detecting') send('depart');
  syncClock();
  openNotification();
  setInterval(syncClock, 1000);
})();

