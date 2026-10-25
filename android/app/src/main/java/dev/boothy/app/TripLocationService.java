package dev.boothy.app;

import android.app.*;
import android.content.*;
import android.location.*;
import android.os.*;
import java.util.concurrent.*;
import org.json.*;

public class TripLocationService extends Service implements LocationListener {
  static volatile boolean running;
  static volatile Location latest;
  private LocationManager manager;
  private long lastRequest;
  private int count, generation;
  private boolean busy;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private String tripId = "";

  @Override
  public void onCreate() {
    super.onCreate();
    Alerts.channels(this);
  }

  @Override
  public int onStartCommand(Intent i, int flags, int startId) {
    JSONObject s = TripStore.state(this),
        r = s == null ? new JSONObject() : TripEngine.obj(s, "ride");
    if (!TripEngine.active(r)) {
      stopSelf();
      return START_NOT_STICKY;
    }
    if (!tripId.equals(r.optString("id"))) {
      generation++;
      tripId = r.optString("id");
      SharedPreferences p = getSharedPreferences(TripStore.PREF, 0);
      boolean same = tripId.equals(p.getString("routeBudgetTrip", ""));
      count = same ? p.getInt("routeBudgetCount", 0) : 0;
      lastRequest = same ? p.getLong("routeBudgetAt", 0) : 0;
    }
    startForeground(
        12,
        Alerts.build(
            this,
            "Boothy · trip location on",
            "Open Boothy to stop tracking.",
            "ride",
            tripId,
            true));
    manager = getSystemService(LocationManager.class);
    try {
      if (!running) {
        if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            && !manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
          MainActivity.publishLocationError(this, "Turn on location in phone settings.");
          stopSelf();
          return START_NOT_STICKY;
        }
        if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER))
          manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10000, 0, this);
        if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER))
          manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 10000, 0, this);
        running = true;
        TripStore.note(this, "Trip location tracking started");
      }
    } catch (SecurityException e) {
      TripStore.pauseRoute(this);
      stopSelf();
    }
    return START_NOT_STICKY;
  }

  @Override
  public void onLocationChanged(Location fix) {
    long age = SystemClock.elapsedRealtimeNanos() - fix.getElapsedRealtimeNanos();
    if (age < 0
        || age > 30000000000L
        || !fix.hasAccuracy()
        || fix.getAccuracy() < 0
        || fix.getAccuracy() > 100
        || !Double.isFinite(fix.getLatitude())
        || !Double.isFinite(fix.getLongitude())) return;
    if (latest != null && fix.getElapsedRealtimeNanos() <= latest.getElapsedRealtimeNanos()) return;
    latest = fix;
    MainActivity.publishLocation(this, fix);
    JSONObject s = TripStore.state(this);
    if (s == null) return;
    JSONObject r = TripEngine.obj(s, "ride");
    if (!TripEngine.active(r)) {
      stopSelf();
      return;
    }
    if (!r.optBoolean("routeRequested")
        || BuildConfig.MAPS_KEY.isBlank()
        || busy
        || count >= 120
        || (lastRequest != 0 && System.currentTimeMillis() - lastRequest < 60000)) return;
    JSONObject destination = TripEngine.copy(TripEngine.obj(r, "destinationPoint"));
    if (!TripEngine.validPoint(destination)) return;
    busy = true;
    count++;
    lastRequest = System.currentTimeMillis();
    getSharedPreferences(TripStore.PREF, 0)
        .edit()
        .putString("routeBudgetTrip", tripId)
        .putInt("routeBudgetCount", count)
        .putLong("routeBudgetAt", lastRequest)
        .apply();
    long observed = System.currentTimeMillis();
    String ride = r.optString("id");
    int token = generation;
    executor.execute(
        () -> {
          try {
            RouteClient.Estimate estimate =
                RouteClient.fetch(this, fix.getLatitude(), fix.getLongitude(), destination);
            handler.post(
                () -> {
                  if (token != generation || !running) return;
                  JSONObject state = TripStore.state(this),
                      current = state == null ? new JSONObject() : TripEngine.obj(state, "ride");
                  if (!current.optBoolean("routeRequested")
                      || !ride.equals(current.optString("id"))
                      || !TripEngine.samePoint(
                          destination, TripEngine.obj(current, "destinationPoint"))) return;
                  JSONObject data = new JSONObject();
                  TripEngine.put(data, "rideId", ride);
                  TripEngine.put(data, "seconds", estimate.seconds());
                  TripEngine.put(data, "observedAt", observed);
                  TripEngine.put(data, "destinationPoint", destination);
                  TripStore.apply(this, "updateRouteEta", data);
                  TripStore.note(this, "Road timing response processed");
                });
          } catch (Exception e) {
            TripStore.note(this, "Road timing failed · old estimates expire after 90 seconds");
          } finally {
            handler.post(() -> busy = false);
          }
        });
  }

  @Override
  public void onProviderDisabled(String provider) {
    TripStore.pauseRoute(this);
    MainActivity.publishLocationError(this, "Location changed. Check your arrival time.");
  }

  @Override
  public void onProviderEnabled(String provider) {}

  @Override
  public void onStatusChanged(String provider, int status, Bundle extras) {}

  @Override
  public void onDestroy() {
    generation++;
    running = false;
    latest = null;
    if (manager != null) manager.removeUpdates(this);
    executor.shutdownNow();
    handler.removeCallbacksAndMessages(null);
    TripStore.pauseRoute(this);
    TripStore.note(this, "Location tracking stopped");
    stopForeground(STOP_FOREGROUND_REMOVE);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent i) {
    return null;
  }
}
