package dev.boothy.app;

import java.util.*;
import org.json.*;

/** Pure trip rules. TripStore serializes commands, GPS responses and Android alarms. */
public final class TripEngine {
  public record Result(JSONObject state, List<String> alerts) {}

  static JSONObject obj(JSONObject o, String k) {
    JSONObject v = o.optJSONObject(k);
    return v == null ? new JSONObject() : v;
  }

  static void put(JSONObject o, String k, Object v) {
    try {
      o.put(k, v);
    } catch (JSONException e) {
      throw new IllegalArgumentException(e);
    }
  }

  static JSONObject copy(JSONObject o) {
    try {
      return new JSONObject(o.toString());
    } catch (JSONException e) {
      throw new IllegalArgumentException(e);
    }
  }

  static boolean active(JSONObject r) {
    return "inTransit".equals(r.optString("stage")) && "real".equals(r.optString("clockMode"));
  }

  static boolean allChecked(JSONObject r) {
    JSONArray a = r.optJSONArray("items");
    if (a == null || a.length() == 0) return false;
    for (int i = 0; i < a.length(); i++) {
      JSONObject item = a.optJSONObject(i);
      if (item == null || !item.optBoolean("checked")) return false;
    }
    return true;
  }

  static boolean routeFresh(JSONObject r, long now) {
    return !r.optBoolean("needsResume")
        && (!"route".equals(r.optString("etaSource"))
            || (r.has("routeUpdatedAt")
                && now - r.optLong("routeUpdatedAt") <= 90000
                && !r.optBoolean("routePaused")));
  }

  static JSONObject freshPre(int revision) {
    JSONObject p = new JSONObject();
    put(p, "status", "scheduled");
    put(p, "revision", revision);
    put(p, "repeatCount", 0);
    return p;
  }

  static void log(JSONObject r, String text) {
    JSONArray old = r.optJSONArray("events"), next = new JSONArray();
    JSONObject e = new JSONObject();
    put(e, "minute", r.optInt("elapsed"));
    put(e, "message", text);
    next.put(e);
    if (old != null) for (int i = 0; i < Math.min(14, old.length()); i++) next.put(old.opt(i));
    put(r, "events", next);
  }

  static boolean validPoint(JSONObject p) {
    double a = p.optDouble("lat", Double.NaN), b = p.optDouble("lng", Double.NaN);
    return Double.isFinite(a) && Double.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
  }

  static boolean samePoint(JSONObject a, JSONObject b) {
    return validPoint(a)
        && validPoint(b)
        && a.optDouble("lat") == b.optDouble("lat")
        && a.optDouble("lng") == b.optDouble("lng");
  }

  public static Result apply(JSONObject source, String action, JSONObject data, long now) {
    JSONObject s = copy(source), r = obj(s, "ride"), c = obj(s, "config");
    List<String> alerts = new ArrayList<>();
    switch (action) {
      case "configure":
        if (data.optJSONObject("config") != null) {
          c = copy(data.optJSONObject("config"));
          put(s, "config", c);
          if (active(r) && data.optBoolean("updateTransit")) {
            JSONObject t = copy(obj(c, "transit"));
            put(t, "status", t.optBoolean("enabled") ? "scheduled" : "off");
            put(r, "transit", t);
          }
        }
        break;
      case "depart":
        if ("ready".equals(r.optString("stage"))) {
          r = new JSONObject();
          put(s, "ride", r);
          put(r, "stage", "inTransit");
          put(r, "clockMode", "real");
          put(r, "elapsed", 0);
          put(r, "events", new JSONArray());
          for (String k : List.of("origin", "destination", "transport", "parkingNote"))
            put(r, k, c.optString(k));
          double minutes = c.optDouble("duration", 15);
          double duration = Double.isFinite(minutes) ? Math.max(3, Math.min(999, minutes)) : 15;
          put(r, "duration", duration);
          put(r, "warningLeadMs", Math.min(180000L, (long)(duration * 40000)));
          put(r, "startedAt", now);
          put(r, "clockAt", now);
          put(r, "etaAt", now + (long) (duration * 60000));
          put(r, "id", UUID.randomUUID().toString());
          put(r, "etaReached", false);
          put(r, "etaSource", "manual");
          put(r, "preArrival", freshPre(0));
          JSONObject t = copy(obj(c, "transit"));
          put(t, "status", t.optBoolean("enabled") ? "scheduled" : "off");
          put(r, "transit", t);
          JSONObject end = copy(obj(c, "end"));
          put(end, "done", false);
          put(r, "end", end);
          JSONArray items = new JSONArray(), names = c.optJSONArray("items");
          if (names != null)
            for (int i = 0; i < Math.min(12, names.length()); i++) {
              JSONObject item = new JSONObject();
              put(item, "id", i);
              put(item, "name", names.optString(i));
              put(item, "checked", false);
              items.put(item);
            }
          put(r, "items", items);
          put(
              r,
              "saveParking",
              c.optBoolean("saveParking") && "car".equals(c.optString("transport")));
          if (validPoint(obj(c, "destinationPoint")))
            put(r, "destinationPoint", copy(obj(c, "destinationPoint")));
          log(r, "Ride started · Android reminders scheduled");
        }
        break;
      case "updateEta":
        if (active(r)) {
          double minutes = data.optDouble("minutes", Double.NaN);
          if (Double.isFinite(minutes) && minutes >= 1 && minutes <= 999) {
            put(r, "etaAt", now + (long) (minutes * 60000));
            put(r, "duration", (r.optLong("etaAt") - r.optLong("startedAt")) / 60000.0);
            put(r, "etaReached", false);
            put(r, "etaSource", "manual");
            put(r, "needsResume", false);
            put(r, "routeRequested", false);
            r.remove("routeUpdatedAt");
            put(r, "routePaused", false);
            put(r, "trackingWarningSent", false);
            if (minutes > 3)
              put(r, "preArrival", freshPre(obj(r, "preArrival").optInt("revision") + 1));
            log(r, "Arrival estimate updated");
          }
        }
        break;
      case "updateRouteEta":
        if (active(r) && r.optString("id").equals(data.optString("rideId"))) {
          double seconds = data.optDouble("seconds", Double.NaN);
          long at = data.optLong("observedAt", 0);
          JSONObject expected = data.optJSONObject("destinationPoint");
          if (Double.isFinite(seconds)
              && seconds >= 0
              && seconds <= 86400
              && at > 0
              && now - at <= 45000
              && at <= now + 5000
              && at > r.optLong("routeUpdatedAt", 0)
              && (expected == null || samePoint(expected, obj(r, "destinationPoint")))) {
            put(r, "etaAt", at + (long) (seconds * 1000));
            put(r, "duration", (r.optLong("etaAt") - r.optLong("startedAt")) / 60000.0);
            put(r, "etaSource", "route");
            put(r, "routeUpdatedAt", at);
            put(r, "needsResume", false);
            put(r, "routePaused", false);
            put(r, "trackingWarningSent", false);
            put(r, "etaReached", false);
          }
        }
        break;
      case "startRouting":
        if (active(r) && validPoint(obj(r, "destinationPoint"))) put(r, "routeRequested", true);
        break;
      case "stopRouting":
        put(r, "routeRequested", false);
        if (active(r) && "route".equals(r.optString("etaSource"))) put(r, "routePaused", true);
        break;
      case "useManualEta":
      case "pauseRoute":
        if (active(r) && "route".equals(r.optString("etaSource"))) put(r, "routePaused", true);
        break;
      case "setDestinationPoint":
        if (active(r) && validPoint(obj(data, "point"))) {
          put(r, "destinationPoint", copy(obj(data, "point")));
          put(c, "destinationPoint", copy(obj(data, "point")));
          if ("route".equals(r.optString("etaSource"))) put(r, "routePaused", true);
          put(r, "routeRequested", false);
        }
        break;
      case "interactReminder":
        put(obj(r, "preArrival"), "interacted", true);
        break;
      case "ackPreArrival":
        if (active(r) && "due".equals(obj(r, "preArrival").optString("status")))
          put(obj(r, "preArrival"), "status", "done");
        break;
      case "snoozePreArrival":
        if (active(r) && "due".equals(obj(r, "preArrival").optString("status"))) {
          JSONObject p = obj(r, "preArrival");
          put(p, "status", "scheduled");
          put(p, "snoozeUntil", now + 60000);
          put(p, "interacted", false);
          put(p, "repeatCount", 1);
        }
        break;
      case "ackTransit":
        if ("due".equals(obj(r, "transit").optString("status")))
          put(obj(r, "transit"), "status", "done");
        break;
      case "snooze":
        if (active(r) && "due".equals(obj(r, "transit").optString("status"))) {
          put(obj(r, "transit"), "status", "scheduled");
          put(obj(r, "transit"), "at", (now - r.optLong("startedAt")) / 60000.0 + 1);
        }
        break;
      case "collect":
        if (List.of("inTransit", "arrived").contains(r.optString("stage"))) {
          JSONArray a = r.optJSONArray("items");
          for (int i = 0; a != null && i < a.length(); i++) {
            JSONObject item = a.optJSONObject(i);
            if (item != null && item.optInt("id") == data.optInt("id", -1))
              put(item, "checked", !item.optBoolean("checked"));
          }
          put(obj(r, "preArrival"), "interacted", true);
        }
        break;
      case "updateItems":
        {
          JSONArray names = data.optJSONArray("items"),
              items = new JSONArray(),
              old = r.optJSONArray("items"),
              unique = new JSONArray();
          Set<String> seen = new HashSet<>();
          for (int i = 0; names != null && i < names.length() && items.length() < 12; i++) {
            String name = names.optString(i).trim();
            if (name.length() > 50) name = name.substring(0, 50);
            if (name.isEmpty() || !seen.add(name)) continue;
            boolean checked = false;
            for (int j = 0; old != null && j < old.length(); j++) {
              JSONObject item = old.optJSONObject(j);
              if (item != null && name.equals(item.optString("name")))
                checked = item.optBoolean("checked");
            }
            JSONObject item = new JSONObject();
            put(item, "id", items.length());
            put(item, "name", name);
            put(item, "checked", checked);
            items.put(item);
            unique.put(name);
          }
          if (items.length() > 0) {
            put(c, "items", unique);
            if (List.of("inTransit", "arrived").contains(r.optString("stage")))
              put(r, "items", items);
            if ("arrived".equals(r.optString("stage"))) put(obj(r, "end"), "done", false);
          }
        }
        break;
      case "arrive":
        if (active(r)) {
          put(r, "stage", "arrived");
          put(r, "arrivedAt", java.time.Instant.ofEpochMilli(now).toString());
          JSONObject t = obj(r, "transit");
          if ("scheduled".equals(t.optString("status"))) put(t, "status", "missed");
          put(obj(r, "preArrival"), "status", "closed");
          if (!allChecked(r)) alerts.add("end");
          else put(obj(r, "end"), "done", true);
          if (r.optBoolean("saveParking")) {
            JSONObject p = new JSONObject();
            put(p, "location", r.optString("destination"));
            put(p, "note", r.optString("parkingNote"));
            put(p, "source", "note");
            put(p, "savedAt", r.optString("arrivedAt"));
            put(s, "parking", p);
          }
          log(r, "Arrival confirmed · check your things");
        }
        break;
      case "ackEnd":
        if ("arrived".equals(r.optString("stage"))) put(obj(r, "end"), "done", true);
        break;
      case "newRide":
        if (!"arrived".equals(r.optString("stage"))
            || !allChecked(r)
            || !obj(r, "end").optBoolean("done")
            || "due".equals(obj(r, "transit").optString("status"))) break;
      case "cancelRide":
        {
          JSONObject ready = new JSONObject();
          put(ready, "stage", "ready");
          put(ready, "elapsed", 0);
          put(ready, "events", new JSONArray());
          put(s, "ride", ready);
          r = ready;
        }
        break;
      case "saveParking":
      case "captureParking":
        {
          String name = data.optString("location").trim();
          if (name.isEmpty()) break;
          JSONObject p = new JSONObject();
          put(p, "location", name.substring(0, Math.min(100, name.length())));
          put(p, "note", data.optString("note"));
          put(p, "savedAt", java.time.Instant.ofEpochMilli(now).toString());
          put(p, "source", "note");
          JSONObject coords = data.optJSONObject("coords");
          if ("captureParking".equals(action) && coords != null && validPoint(coords)) {
            put(p, "coords", coords);
            put(p, "source", "gps");
          } else if (name.equals(obj(s, "parking").optString("location"))
              && obj(s, "parking").has("coords")) {
            put(p, "coords", obj(s, "parking").optJSONObject("coords"));
            put(p, "source", "gps");
          }
          put(s, "parking", p);
        }
        break;
    }
    if (active(r)) tick(r, now, alerts);
    return new Result(s, alerts);
  }

  // Short trips still get preparation time without alarming at departure.
  static long warningAt(JSONObject r) {
    return r.optLong("etaAt") - r.optLong("warningLeadMs", 180000L);
  }

  static void tick(JSONObject r, long now, List<String> alerts) {
    put(r, "clockAt", now);
    put(r, "elapsed", Math.max(0, (now - r.optLong("startedAt")) / 60000));
    if (r.optBoolean("needsResume")) return;
    JSONObject p = obj(r, "preArrival"), t = obj(r, "transit");
    boolean fresh = routeFresh(r, now);
    if (!fresh && !r.optBoolean("trackingWarningSent")) {
      put(r, "trackingWarningSent", true);
      alerts.add("tracking");
    }
    if ("scheduled".equals(t.optString("status"))
        && now >= r.optLong("startedAt") + (long) (t.optDouble("at", 2) * 60000)) {
      put(t, "status", "due");
      alerts.add("transit");
      log(r, "During-ride reminder");
    }
    long warning = p.has("snoozeUntil") ? p.optLong("snoozeUntil") : warningAt(r);
    if ("scheduled".equals(p.optString("status"))
        && (fresh || p.has("snoozeUntil"))
        && now >= warning) {
      put(p, "status", "due");
      put(p, "deliveredAtMs", now);
      put(p, "deliveredAt", r.optInt("elapsed"));
      p.remove("snoozeUntil");
      alerts.add("before");
      log(r, "Get your belongings ready");
    }
    if (fresh
        && "due".equals(p.optString("status"))
        && !p.optBoolean("interacted")
        && p.optInt("repeatCount") == 0
        && !allChecked(r)
        && now - p.optLong("deliveredAtMs", now) >= 60000) {
      put(p, "repeatCount", 1);
      alerts.add("before");
    }
    if (fresh && now >= r.optLong("etaAt") && !r.optBoolean("etaReached")) {
      put(r, "etaReached", true);
      if (!alerts.contains("before") && !allChecked(r)) alerts.add("eta");
    }
  }

  public static long nextAlarm(JSONObject s, long now) {
    JSONObject r = obj(s, "ride");
    if (!active(r) || r.optBoolean("needsResume")) return Long.MAX_VALUE;
    JSONObject p = obj(r, "preArrival"), t = obj(r, "transit");
    long next = Long.MAX_VALUE;
    boolean fresh = routeFresh(r, now);
    if ("route".equals(r.optString("etaSource")) && !r.optBoolean("trackingWarningSent"))
      next =
          Math.min(next, r.optBoolean("routePaused") ? now : r.optLong("routeUpdatedAt") + 90001);
    if ("scheduled".equals(p.optString("status")) && (fresh || p.has("snoozeUntil")))
      next =
          Math.min(
              next, p.has("snoozeUntil") ? p.optLong("snoozeUntil") : warningAt(r));
    if (fresh
        && "due".equals(p.optString("status"))
        && !p.optBoolean("interacted")
        && p.optInt("repeatCount") == 0
        && !allChecked(r)) next = Math.min(next, p.optLong("deliveredAtMs", now) + 60000);
    if ("scheduled".equals(t.optString("status")))
      next = Math.min(next, r.optLong("startedAt") + (long) (t.optDouble("at", 2) * 60000));
    if (fresh && !r.optBoolean("etaReached")) next = Math.min(next, r.optLong("etaAt"));
    return next == Long.MAX_VALUE ? next : Math.max(now + 100, next);
  }
}
