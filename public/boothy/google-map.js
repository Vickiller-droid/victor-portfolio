(function () {
  'use strict';
  const G = window.BoothyLocation, policy = window.BoothyRoutePolicy;
  let configPromise, loader, dialog, map, userDot, accuracy, pin, path;
  let options = {}, target, selected, selectedName = '', latest = { status:'off', fix:null };
  let routeEnabled = false, routeBusy = false, lastRoute = 0, requestCount = 0, generation = 0, follow = true;
  let sessionRide = '', message = '', searchVersion = 0, googleMaps;
  const tracker = G.createTracker(window.BoothyNative?.geolocation || navigator.geolocation, update);
  async function config() {
    if (!configPromise) configPromise = (async () => {
      const native = window.BoothyNative?.available;
      const url = native ? 'https://victor-portfolio-olive.vercel.app/api/boothy-maps-config' : '/api/boothy-maps-config';
      try { const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache:'no-store' }); return response.ok ? await response.json() : { provider:'osm' }; }
      catch { return { provider:'osm' }; }
    })();
    return configPromise;
  }
  function load(key) {
    if (window.google?.maps?.importLibrary) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      const id = 'boothyGoogleReady';
      const timer = setTimeout(() => { script.remove(); delete window[id]; loader = null; reject(Error('timeout')); },12000);
      window[id] = () => { clearTimeout(timer); delete window[id]; resolve(); };
      script.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({ key, callback:id, loading:'async', v:'quarterly', language:'en', region:'NG' });
      script.onerror = () => { clearTimeout(timer); script.remove(); delete window[id]; loader = null; reject(Error('load')); };
      document.head.append(script);
    });
    return loader;
  }
  function styles() {
    const dark = document.documentElement.dataset.theme === 'dark';
    return [
      {elementType:'geometry',stylers:[{color:dark?'#21372e':'#ecece0'}]},
      {elementType:'labels.text.fill',stylers:[{color:dark?'#c0ccb9':'#526253'}]},
      {elementType:'labels.text.stroke',stylers:[{color:dark?'#21372e':'#f7f7ef'}]},
      {featureType:'water',elementType:'geometry',stylers:[{color:dark?'#17272d':'#c1d8d8'}]},
      {featureType:'road',elementType:'geometry',stylers:[{color:dark?'#465548':'#ffffff'}]},
      {featureType:'road.highway',elementType:'geometry',stylers:[{color:dark?'#80704e':'#dfc7a0'}]},
      {featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]},
      {featureType:'transit',elementType:'labels',stylers:[{visibility:'off'}]}
    ];
  }
  function ensureDialog() {
    if (dialog) return;
    dialog=document.createElement('dialog'); dialog.className='live-map-dialog';dialog.setAttribute('aria-labelledby','google-trip-title');
    dialog.innerHTML='<div class="map-dialog-header"><h2 id="google-trip-title">Your trip map</h2><button class="text-button" data-gmap="close">Close map</button></div><form class="map-search"><input aria-label="Find a destination" placeholder="Search a place or address" required maxlength="150"><button class="button outline" type="submit">Search</button></form><div class="map-results" aria-live="polite"></div><div class="google-map-canvas" style="height:350px;border-radius:16px;overflow:hidden" role="region" aria-label="Google trip map"></div><p class="map-status" role="status" aria-live="polite"></p><p class="map-distance"></p><div class="map-controls"><button class="button outline" data-gmap="gps">Use my live location</button><button class="button outline" data-gmap="center">Centre on me</button><button class="button outline" data-gmap="pinCenter">Pin map centre</button><button class="button primary" data-gmap="select">Use this destination</button><button class="button primary full" data-gmap="route" hidden>Use road timing</button></div><p class="map-privacy">Google receives your searches and viewed map area. Road timing sends your current position and destination to Google while it is on.</p>';
    document.body.append(dialog);
    dialog.querySelector('[data-gmap=close]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{ searchVersion++; if(!options.keepTracking) stopTracking(); });
    dialog.querySelector('[data-gmap=gps]').onclick=()=>{ if(tracker.running()) stopTracking(); else { follow=true;tracker.start(); }paint(); };
    dialog.querySelector('[data-gmap=center]').onclick=()=>{ if(latest.fix){follow=true;map?.setCenter(latest.fix);map?.setZoom(16);} };
    dialog.querySelector('[data-gmap=pinCenter]').onclick=()=>{ if(map) choose(map.getCenter().toJSON()); };
    dialog.querySelector('[data-gmap=select]').onclick=()=>{ if(selected){ invalidateRoute();target={...selected};options.onSelect?.(target,selectedName);dialog.close();} };
    dialog.querySelector('[data-gmap=route]').onclick=()=>{
      if(routeEnabled){invalidateRoute();options.onStopRoute?.();paint();return;}
      if(!selected || latest.status!=='live')return;
      target={...selected};options.onSelect?.(target,selectedName);routeEnabled=true;lastRoute=0;if(window.BoothyNative?.available)window.BoothyNative.routing(true);else route();paint();
    };
    dialog.querySelector('form').onsubmit=async event=>{
      event.preventDefault();const input=dialog.querySelector('input');const query=input.value.trim();if(!query)return;
      const token=++searchVersion, submit=dialog.querySelector('form button');submit.disabled=true;
      const results=dialog.querySelector('.map-results');results.textContent='Searching…';
      try{
        const {Place}=await google.maps.importLibrary('places');
        const request={textQuery:query,fields:['displayName','formattedAddress','location'],maxResultCount:5,region:'ng'};
        if(latest.fix)request.locationBias={center:latest.fix,radius:15000};
        const response=await Place.searchByText(request);if(token!==searchVersion)return;
        results.replaceChildren();
        for(const place of response.places||[]){
          if(!place.location)continue;const button=document.createElement('button');button.type='button';button.className='map-result';
          button.textContent=place.displayName||'Destination';const detail=document.createElement('small');detail.textContent=place.formattedAddress||'';button.append(detail);
          button.onclick=()=>{choose(place.location.toJSON(),place.displayName);map.setCenter(place.location);map.setZoom(15);results.replaceChildren();};results.append(button);
        }
        if(!results.children.length)results.textContent='No places found. Try a nearby landmark or drop a pin.';
      }catch{if(token===searchVersion)results.textContent='Search is unavailable. Try again or choose a pin.';}
      finally{submit.disabled=false;}
    };
  }
  function invalidateRoute() { if(routeEnabled){options.onStopRoute?.();window.BoothyNative?.routing(false);}generation++; routeEnabled=false;lastRoute=0; if(path){path.setMap(null);path=null;}message=''; }
  function choose(point,name='') { invalidateRoute();selected=G.point(point);selectedName=name;showPin();message='Destination selected.';paint(); }
  function showPin() { if(!map||!selected)return;if(!pin)pin=new googleMaps.Circle({map,radius:20,strokeColor:'#fff',strokeWeight:3,fillColor:'#bf4c25',fillOpacity:1});pin.setCenter(selected); }
  function update(value) {
    latest=value;
    if(map && value.fix){
      if(!userDot)userDot=new googleMaps.Circle({map,radius:12,strokeColor:'#fff',strokeWeight:3,fillColor:'#2d775c',fillOpacity:1});
      userDot.setCenter(value.fix);userDot.setOptions({fillColor:value.status==='live'?'#2d775c':'#968475'});
      if(!accuracy)accuracy=new googleMaps.Circle({map,strokeColor:'#2d775c',strokeOpacity:.3,fillColor:'#4f9273',fillOpacity:.1,strokeWeight:1});
      accuracy.setCenter(value.fix);accuracy.setRadius(Math.min(value.fix.accuracy,10000));
      if(follow&&dialog.open){map.setCenter(value.fix);if(map.getZoom()<15)map.setZoom(15);}
    }
    if(value.status!=='live' && routeEnabled){message='Waiting for an accurate location. Arrival warnings pause until location recovers.';options.onRouteStatus?.('stale');}
    paint();route();
  }
  function paint() {
    if(!dialog)return;
    const names={off:'Location is off.',locating:'Finding your location…',live:'Live location',imprecise:'Location is approximate.',stale:'Location has not updated.',denied:'Location permission is blocked.',timeout:'Location is taking longer.',unavailable:'Location is unavailable.',unsupported:'Location is unavailable here.'};
    dialog.querySelector('.map-status').textContent=message||names[latest.status]||'Waiting for location.';
    const d=latest.fix&&selected?G.distance(latest.fix,selected):null;
    dialog.querySelector('.map-distance').textContent=routeEnabled?'Road timing is on. Updates about once a minute.':d===null?'':(d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m')+' to pin · straight line';
    dialog.querySelector('[data-gmap=gps]').textContent=tracker.running()?'Stop live location':'Use my live location';
    dialog.querySelector('[data-gmap=center]').disabled=!latest.fix;
    dialog.querySelector('[data-gmap=select]').disabled=!selected;
    const routeButton=dialog.querySelector('[data-gmap=route]');routeButton.hidden=!options.keepTracking;
    routeButton.textContent=routeEnabled?'Stop road timing':'Use road timing';routeButton.disabled=!routeEnabled&&(!selected||latest.status!=='live'||(window.BoothyNative?.available&&!window.BoothyNative.capabilities().nativeRouting));
  }
  async function route() {
    const now=Date.now();if(window.BoothyNative?.available||!routeEnabled||routeBusy||!target||latest.status!=='live'||!policy.mayRequest(lastRoute,latest.fix,now,requestCount))return;
    routeBusy=true;lastRoute=now;requestCount++;const token=generation,rideId=sessionRide,origin={lat:latest.fix.lat,lng:latest.fix.lng};
    try{
      const {Route}=await google.maps.importLibrary('routes');
      const response=await Route.computeRoutes({origin,destination:target,travelMode:'DRIVING',routingPreference:'TRAFFIC_AWARE',fields:['durationMillis','distanceMeters','path','warnings']});
      if(token!==generation||!routeEnabled||rideId!==sessionRide||Date.now()-now>45000)return;
      const result=response.routes?.[0], accepted=policy.acceptRoute(result);if(!accepted)throw Error('No road route');
      if(path)path.setMap(null);path=new googleMaps.Polyline({map,path:result.path,strokeColor:'#b85129',strokeWeight:6,strokeOpacity:.9});
      message='About '+Math.ceil(accepted.seconds/60)+' min by road. '+(result.warnings||[]).join(' ');
      options.onRoute?.({...accepted,observedAt:now,rideId,destinationPoint:{...target}});options.onRouteStatus?.('live');
    }catch{if(token===generation){message='Road timing could not update. Reconnect location or enter a new time.';options.onRouteStatus?.('unavailable');}}
    finally{routeBusy=false;paint();}
  }
  async function open(next, cfg) {
    options=next;ensureDialog();
    if(sessionRide!==String(next.rideId||'')){invalidateRoute();requestCount=0;sessionRide=String(next.rideId||'');}
    target=G.point(next.point);selected=target;selectedName='';searchVersion++;
    if(!dialog.open)dialog.showModal();message='Loading map…';paint();
    try{
      await load(cfg.browserKey);googleMaps=await google.maps.importLibrary('maps');
      if(!map){map=new googleMaps.Map(dialog.querySelector('.google-map-canvas'),{center:target||{lat:9.06,lng:7.49},zoom:target?15:11,styles:styles(),mapTypeControl:false,streetViewControl:false,fullscreenControl:false,gestureHandling:'cooperative'});map.addListener('dragstart',()=>follow=false);map.addListener('click',event=>choose(event.latLng.toJSON()));}
      if(target){showPin();map.setCenter(target);}message='';paint();
    }catch{message='The map could not load. Your trip timer still works.';paint();}
  }
  function stopTracking(){tracker.stop();invalidateRoute();options.onStopRoute?.();if(userDot){userDot.setMap(null);userDot=null;}if(accuracy){accuracy.setMap(null);accuracy=null;}}
  function stop(){stopTracking();if(dialog?.open)dialog.close();}
  window.addEventListener('boothytheme',()=>map?.setOptions({styles:styles()}));
  window.addEventListener('pagehide',()=>{if(!window.BoothyNative?.available)stop();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tracker.refresh();paint();route();}});
  setInterval(()=>{tracker.refresh();route();},10000);
  window.BoothyGoogleMap={config,open,stop,stopRouting(){invalidateRoute();paint();}};
})();
