package dev.boothy.app;

import android.content.*;
import java.util.*;
import org.json.*;

public final class TripStore {
  static final String PREF = "boothy_private_trip";
  private static JSONObject cached;
  private static long persistedAt;

  static synchronized JSONObject read(Context c) {
    if (cached == null) {
      try {
        cached = new JSONObject(c.getSharedPreferences(PREF, 0).getString("payload", "{}"));
      } catch (Exception e) {
        cached = new JSONObject();
      }
    }
    return TripEngine.copy(cached);
  }

  static JSONObject state(Context c) {
    return read(c).optJSONObject("state");
  }

  static synchronized void init(Context c, JSONObject payload) {
    JSONObject s = payload.optJSONObject("state");
    if (state(c) == null
        && s != null
        && s.optInt("version") == 1
        && s.optJSONObject("ride") != null
        && s.optJSONObject("config") != null) write(c, payload);
  }

  // Persist transitions before posting alerts so process death cannot repeat a delivered reminder.
  @android.annotation.SuppressLint("ApplySharedPref")
  static synchronized void write(Context c, JSONObject p) {
    if (!c.getSharedPreferences(PREF, 0).edit().putString("payload", p.toString()).commit())
      throw new IllegalStateException("Trip storage failed");
    cached = TripEngine.copy(p);
    persistedAt = System.currentTimeMillis();
  }

  static String durable(JSONObject state) {
    JSONObject s = TripEngine.copy(state), r = TripEngine.obj(s, "ride");
    r.remove("clockAt");
    r.remove("elapsed");
    return s.toString();
  }

  static synchronized void preferences(Context c, JSONObject options, boolean voice) {
    JSONObject p = read(c);
    TripEngine.put(p, "options", options);
    TripEngine.put(p, "voice", voice);
    write(c, p);
  }

  static synchronized JSONObject apply(Context c, String action, JSONObject data) {
    JSONObject payload = read(c), current = payload.optJSONObject("state");
    if (current == null) return new JSONObject();
    TripEngine.Result result = TripEngine.apply(current, action, data, System.currentTimeMillis());
    TripEngine.put(payload, "state", result.state());
    if (!"tick".equals(action)
        || !durable(current).equals(durable(result.state()))
        || System.currentTimeMillis() - persistedAt >= 60000) write(c, payload);
    else cached = TripEngine.copy(payload);
    if (List.of(
            "interactReminder",
            "ackPreArrival",
            "ackTransit",
            "ackEnd",
            "snoozePreArrival",
            "snooze",
            "cancelRide",
            "newRide",
            "collect")
        .contains(action)) c.stopService(new Intent(c, AlertService.class));
    if (List.of("arrive", "cancelRide", "newRide").contains(action))
      c.stopService(new Intent(c, TripLocationService.class));
    if (List.of(
            "cancelRide",
            "newRide",
            "ackEnd",
            "ackTransit",
            "ackPreArrival",
            "snoozePreArrival",
            "interactReminder")
        .contains(action)) c.getSystemService(android.app.NotificationManager.class).cancel(10);
    Alarms.schedule(c, result.state());
    if (!result.alerts().isEmpty()) note(c, "Trip alert due: " + String.join(",", result.alerts()));
    if (!result.alerts().isEmpty()) Alerts.deliver(c, result.state(), result.alerts());
    MainActivity.publish(c);
    return result.state();
  }

  static synchronized void pauseRoute(Context c) {
    if (state(c) != null) apply(c, "pauseRoute", new JSONObject());
  }

  static synchronized void note(Context c, String event) {
    SharedPreferences p = c.getSharedPreferences(PREF, 0);
    JSONArray a;
    try {
      a = new JSONArray(p.getString("diagnostics", "[]"));
    } catch (Exception e) {
      a = new JSONArray();
    }
    JSONObject row = new JSONObject();
    TripEngine.put(row, "time", System.currentTimeMillis());
    TripEngine.put(row, "event", event);
    JSONArray next = new JSONArray();
    next.put(row);
    for (int i = 0; i < Math.min(39, a.length()); i++) next.put(a.opt(i));
    p.edit().putString("diagnostics", next.toString()).apply();
  }

  static synchronized void clearMemoryForTest() {
    cached = null;
    persistedAt = 0;
  }
}
