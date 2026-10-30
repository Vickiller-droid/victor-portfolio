package dev.boothy.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import androidx.webkit.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

public class MainActivity extends ComponentActivity {
  static final String ORIGIN = "https://appassets.androidplatform.net",
      BASE = ORIGIN + "/assets/boothy/index.html",
      EVENT = "dev.boothy.app.STATE";
  WebView web;
  boolean loaded, registered;
  String locationRequest, pointRequest;
  final Handler pointHandler = new Handler(Looper.getMainLooper());
  LocationManager pointManager;
  LocationListener pointListener;
  final BroadcastReceiver changes =
      new BroadcastReceiver() {
        public void onReceive(Context c, Intent i) {
          sendState();
          if (i.hasExtra("location"))
            evaluate(
                "window.BoothyNative?.receiveLocation("
                    + JSONObject.quote(i.getStringExtra("location"))
                    + ")");
          if (i.hasExtra("error"))
            evaluate(
                "window.BoothyNative?.locationError("
                    + JSONObject.quote(i.getStringExtra("error"))
                    + ")");
        }
      };

  static void publish(Context c) {
    c.sendBroadcast(new Intent(EVENT).setPackage(c.getPackageName()));
  }

  static JSONObject position(Location l) {
    JSONObject p = new JSONObject(), coords = new JSONObject();
    TripEngine.put(coords, "latitude", l.getLatitude());
    TripEngine.put(coords, "longitude", l.getLongitude());
    TripEngine.put(coords, "accuracy", l.getAccuracy());
    TripEngine.put(p, "coords", coords);
    TripEngine.put(p, "timestamp", l.getTime());
    return p;
  }

  static void publishLocation(Context c, Location l) {
    c.sendBroadcast(
        new Intent(EVENT)
            .setPackage(c.getPackageName())
            .putExtra("location", position(l).toString()));
  }

  static void publishLocationError(Context c, String message) {
    c.sendBroadcast(new Intent(EVENT).setPackage(c.getPackageName()).putExtra("error", message));
  }

  JSONObject capabilities() {
    JSONObject c = new JSONObject();
    TripEngine.put(c, "notifications", Alerts.allowed(this));
    TripEngine.put(c, "alarms", Alarms.allowed(this));
    TripEngine.put(
        c,
        "location",
        checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED);
    TripEngine.put(c, "nativeRouting", !BuildConfig.MAPS_KEY.isBlank());
    TripEngine.put(c, "tracking", TripLocationService.running);
    TripEngine.put(c, "version", BuildConfig.VERSION_NAME);
    return c;
  }

  JSONObject boot() {
    JSONObject p = TripStore.read(this);
    TripEngine.put(p, "caps", capabilities());
    TripEngine.put(p, "buildVersion", BuildConfig.VERSION_NAME);
    return p;
  }

  // JavaScript is required for the bundled UI. Only its exact origin/main frame may use the bridge.
  @android.annotation.SuppressLint({"SetJavaScriptEnabled", "RequiresFeature"})
  @Override
  public void onCreate(Bundle saved) {
    super.onCreate(saved);
    Alerts.channels(this);
    FrameLayout root = new FrameLayout(this);
    root.setBackgroundColor(Color.rgb(23, 38, 31));
    web = new WebView(this);
    // Clear rendered resources only; retain trip preferences and DOM storage.
    web.clearCache(true);
    root.addView(web, new FrameLayout.LayoutParams(-1, -1));
    setContentView(root);
    root.setOnApplyWindowInsetsListener(
        (v, insets) -> {
          if (Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets bars =
                insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
          } else
            v.setPadding(
                insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom());
          return insets;
        });
    WebSettings settings = web.getSettings();
    settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setMediaPlaybackRequiresUserGesture(true);
    settings.setSupportMultipleWindows(false);
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      TextView msg = new TextView(this);
      msg.setText(R.string.update_webview);
      msg.setPadding(30, 80, 30, 30);
      setContentView(msg);
      return;
    }
    WebViewAssetLoader assets =
        new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
    WebViewCompat.addWebMessageListener(
        web,
        "BoothyChannel",
        Set.of(ORIGIN),
        (view, message, source, isMain, reply) -> {
          if (!isMain
              || !"https".equals(source.getScheme())
              || !"appassets.androidplatform.net".equals(source.getHost())
              || (source.getPort() != -1 && source.getPort() != 443)) return;
          String id = "";
          try {
            String raw = message.getData();
            if (raw == null || raw.length() > 100000) return;
            JSONObject req = new JSONObject(raw);
            id = req.optString("id");
            handle(req);
          } catch (Exception e) {
            TripStore.note(this, "Change could not be saved or completed");
            reply(id, false);
          }
        });
    web.setWebViewClient(
        new WebViewClient() {
          @Override
          public WebResourceResponse shouldInterceptRequest(
              WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equals(uri.getScheme())
                && "appassets.androidplatform.net".equals(uri.getHost())
                && "/assets/boothy/android-bootstrap.js".equals(uri.getPath()))
              return new WebResourceResponse(
                  "application/javascript",
                  "UTF-8",
                  new ByteArrayInputStream(
                      ("window.BoothyBoot=" + boot() + ";").getBytes(StandardCharsets.UTF_8)));
            WebResourceResponse resource = assets.shouldInterceptRequest(uri);
            if (resource != null) resource.setResponseHeaders(java.util.Map.of("Cache-Control", "no-store"));
            return resource;
          }

          @Override
          public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            if (ORIGIN.equals(u.getScheme() + "://" + u.getHost())
                && u.getPath() != null
                && u.getPath().startsWith("/assets/boothy/")) return false;
            if (r.isForMainFrame() && List.of("https", "mailto").contains(u.getScheme()))
              try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
              } catch (Exception ignored) {
              }
            return true;
          }

          @Override
          public void onPageFinished(WebView v, String url) {
            loaded = true;
            consumeNotification(getIntent());
            sendState();
          }
        });
    ContextCompat.registerReceiver(
        this, changes, new IntentFilter(EVENT), ContextCompat.RECEIVER_NOT_EXPORTED);
    registered = true;
    getOnBackPressedDispatcher()
        .addCallback(
            this,
            new OnBackPressedCallback(true) {
              public void handleOnBackPressed() {
                if (web == null || !loaded) {
                  finish();
                  return;
                }
                web.evaluateJavascript(
                    "window.BoothyBack?.() || false",
                    handled -> {
                      if ("true".equals(handled)) return;
                      if (web.canGoBack()) web.goBack();
                      else finish();
                    });
              }
            });
    web.loadUrl(target(getIntent()));
  }

  void handle(JSONObject req) throws Exception {
    String action = req.optString("action"), id = req.optString("id");
    switch (action) {
      case "init":
        TripStore.init(this, req.getJSONObject("payload"));
        sendState();
        reply(id, true);
        break;
      case "preferences":
        TripStore.preferences(
            this,
            req.optJSONObject("options") == null ? new JSONObject() : req.optJSONObject("options"),
            req.optBoolean("voice"));
        reply(id, true);
        break;
      case "command":
        if ("depart".equals(req.optString("command"))
            && (!Alarms.allowed(this) || !Alerts.allowed(this))) {
          reply(id, false);
          break;
        }
        TripStore.apply(
            this,
            req.optString("command"),
            req.optJSONObject("data") == null ? new JSONObject() : req.optJSONObject("data"));
        reply(id, true);
        break;
      case "snapshot":
        sendState();
        reply(id, true);
        break;
      case "stopSound":
        stopService(new Intent(this, AlertService.class));
        reply(id, true);
        break;
      case "permissions":
        permissionFlow();
        reply(id, true);
        break;
      case "point":
        if (pointRequest != null) {
          reply(id, false);
          break;
        }
        pointRequest = id;
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED)
          requestPermissions(
              new String[] {
                Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
              },
              43);
        else capturePoint();
        break;
      case "location":
        if (!req.optBoolean("enabled")) {
          stopService(new Intent(this, TripLocationService.class));
          reply(id, true);
        } else if (TripStore.state(this) == null
            || !TripEngine.active(TripEngine.obj(TripStore.state(this), "ride"))) {
          reply(id, false);
        } else if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
          locationRequest = id;
          requestPermissions(
              new String[] {
                Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
              },
              42);
        } else reply(id, startLocation());
        break;
      case "route":
        if (BuildConfig.MAPS_KEY.isBlank()) {
          reply(id, false);
          break;
        }
        TripStore.apply(
            this, req.optBoolean("enabled") ? "startRouting" : "stopRouting", new JSONObject());
        reply(id, true);
        break;
      case "notify":
        Alerts.notice(this, req.optString("title"), req.optString("body"), "test", "");
        reply(id, Alerts.allowed(this));
        break;
      case "test":
        Alerts.deliver(this, TripStore.state(this), List.of("test"));
        reply(id, true);
        break;
      case "testLater":
        reply(id, Alarms.test(this));
        break;
      case "cancelTest":
        Alarms.cancelTest(this);
        reply(id, true);
        break;
      case "speak":
        String text = req.optString("text");
        if (text.length() > 500) text = text.substring(0, 500);
        startForegroundService(
            new Intent(this, AlertService.class)
                .putExtra("voice", text)
                .putExtra("voicePreview", true)
                .putExtra("kind", "test"));
        reply(id, true);
        break;
      case "diagnostics":
        evaluate(
            "window.BoothyNative?.receive("
                + JSONObject.quote(id)
                + ","
                + getSharedPreferences(TripStore.PREF, 0).getString("diagnostics", "[]")
                + ")");
        break;
      default:
        reply(id, false);
    }
  }

  boolean startLocation() {
    try {
      startForegroundService(new Intent(this, TripLocationService.class));
      return true;
    } catch (Exception e) {
      TripStore.note(this, "Location service failed to start");
      return false;
    }
  }

  void capturePoint() {
    pointManager = getSystemService(LocationManager.class);
    pointListener =
        new LocationListener() {
          public void onLocationChanged(Location l) {
            long age = SystemClock.elapsedRealtimeNanos() - l.getElapsedRealtimeNanos();
            if (age < 0 || age > 30000000000L || !l.hasAccuracy() || l.getAccuracy() > 100) return;
            String id = pointRequest;
            finishPoint(false);
            evaluate(
                "window.BoothyNative?.receive(" + JSONObject.quote(id) + "," + position(l) + ")");
          }

          public void onProviderEnabled(String p) {}

          public void onProviderDisabled(String p) {}

          public void onStatusChanged(String p, int status, Bundle b) {}
        };
    try {
      if (pointManager.isProviderEnabled(LocationManager.GPS_PROVIDER))
        pointManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, pointListener);
      if (pointManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
        pointManager.requestLocationUpdates(
            LocationManager.NETWORK_PROVIDER, 1000, 0, pointListener);
      pointHandler.postDelayed(() -> finishPoint(true), 15000);
    } catch (SecurityException e) {
      finishPoint(true);
    }
  }

  void finishPoint(boolean failed) {
    pointHandler.removeCallbacksAndMessages(null);
    if (pointListener != null && pointManager != null) pointManager.removeUpdates(pointListener);
    pointListener = null;
    if (failed) reply(pointRequest, false);
    pointRequest = null;
  }

  void permissionFlow() {
    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, 41);
      return;
    }
    if (!Alerts.allowed(this)) {
      startActivity(
          new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
              .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()));
      return;
    }
    if (!Alarms.allowed(this)) {
      startActivity(
          new Intent(
              Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
              Uri.parse("package:" + getPackageName())));
      return;
    }
    sendState();
  }

  @Override
  public void onRequestPermissionsResult(int code, String[] names, int[] results) {
    super.onRequestPermissionsResult(code, names, results);
    if (code == 41 && results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED)
      permissionFlow();
    if (code == 42) {
      boolean fine =
          checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
              == PackageManager.PERMISSION_GRANTED;
      if (fine) fine = startLocation();
      reply(locationRequest, fine);
      locationRequest = null;
    }
    if (code == 43) {
      if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
          == PackageManager.PERMISSION_GRANTED) capturePoint();
      else finishPoint(true);
    }
    sendState();
  }

  void reply(String id, boolean value) {
    if (id != null && !id.isEmpty())
      evaluate("window.BoothyNative?.receive(" + JSONObject.quote(id) + "," + value + ")");
  }

  void evaluate(String js) {
    if (loaded && web != null) web.evaluateJavascript(js, null);
  }

  void sendState() {
    if (!loaded) return;
    JSONObject state = TripStore.state(this);
    if (state != null)
      evaluate("window.BoothyNative?.receiveState(" + JSONObject.quote(state.toString()) + ")");
    evaluate("window.BoothyNative?.receiveCapabilities(" + capabilities() + ")");
  }

  String target(Intent intent) {
    String kind = intent.getStringExtra("kind"), ride = intent.getStringExtra("rideId");
    if (kind == null) return BASE;
    if (!List.of("before", "end", "eta", "transit", "tracking", "test", "ride").contains(kind))
      kind = "ride";
    return BASE
        + "#notification?kind="
        + Uri.encode(kind)
        + "&ride="
        + Uri.encode(ride == null ? "" : ride);
  }

  void consumeNotification(Intent i) {
    String kind = i.getStringExtra("kind");
    if (kind == null) return;
    JSONObject s = TripStore.state(this);
    if ("test".equals(kind)) stopService(new Intent(this, AlertService.class));
    else if (s != null
        && TripEngine.obj(s, "ride").optString("id").equals(i.getStringExtra("rideId"))) {
      stopService(new Intent(this, AlertService.class));
      if (List.of("before", "end").contains(kind))
        TripStore.apply(this, "interactReminder", new JSONObject());
    }
    i.removeExtra("kind");
  }

  @Override
  protected void onNewIntent(Intent i) {
    super.onNewIntent(i);
    setIntent(i);
    String url = target(i);
    consumeNotification(i);
    web.loadUrl(url);
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (web != null) web.onResume();
    sendState();
  }

  @Override
  protected void onPause() {
    if (pointListener != null) finishPoint(true);
    if (web != null) web.onPause();
    super.onPause();
  }

  @Override
  public void onDestroy() {
    finishPoint(false);
    if (registered) unregisterReceiver(changes);
    if (web != null) web.destroy();
    super.onDestroy();
  }
}
