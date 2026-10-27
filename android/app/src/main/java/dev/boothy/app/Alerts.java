package dev.boothy.app;

import android.app.*;
import android.content.*;
import java.util.*;
import org.json.*;

public final class Alerts {
  static final String CHANNEL = "boothy_reminders_v1", SERVICE_CHANNEL = "boothy_trip_v1";

  static void channels(Context c) {
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    NotificationChannel a =
        new NotificationChannel(CHANNEL, "Trip reminders", NotificationManager.IMPORTANCE_HIGH);
    a.setDescription("Arrival reminders and belongings checks");
    a.setSound(null, null);
    a.enableVibration(false);
    a.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
    nm.createNotificationChannel(a);
    NotificationChannel t =
        new NotificationChannel(
            SERVICE_CHANNEL, "Trip services", NotificationManager.IMPORTANCE_LOW);
    t.setSound(null, null);
    nm.createNotificationChannel(t);
  }

  static boolean allowed(Context c) {
    NotificationManager nm = c.getSystemService(NotificationManager.class);
    NotificationChannel channel = nm.getNotificationChannel(CHANNEL);
    return nm.areNotificationsEnabled()
        && (channel == null || channel.getImportance() != NotificationManager.IMPORTANCE_NONE);
  }

  static PendingIntent open(Context c, String kind, String ride) {
    return PendingIntent.getActivity(
        c,
        (kind + ride).hashCode(),
        new Intent(c, MainActivity.class)
            .putExtra("kind", kind)
            .putExtra("rideId", ride)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static PendingIntent action(Context c, int id, String action, String ride) {
    return PendingIntent.getBroadcast(
        c,
        id,
        new Intent(c, AlarmReceiver.class).setAction(action).putExtra("rideId", ride),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static Notification build(
      Context c, String title, String body, String kind, String ride, boolean ongoing) {
    Notification.Builder b =
        new Notification.Builder(c, ongoing ? SERVICE_CHANNEL : CHANNEL)
            .setSmallIcon(R.drawable.ic_boothy)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setContentIntent(open(c, kind, ride))
            .setAutoCancel(!ongoing)
            .setOngoing(ongoing)
            .setCategory(ongoing ? Notification.CATEGORY_SERVICE : Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE);
    if (!ongoing) {
      b.addAction(
          new Notification.Action.Builder(null, "Stop sound", action(c, 3, "stopSound", ride))
              .build());
      if ("before".equals(kind))
        b.addAction(
            new Notification.Action.Builder(null, "Snooze 1 min", action(c, 4, "snooze", ride))
                .build());
    }
    return b.build();
  }

  static void notice(Context c, String title, String body, String kind, String ride) {
    channels(c);
    if (!allowed(c)) {
      TripStore.note(c, "Notifications blocked");
      return;
    }
    try {
      c.getSystemService(NotificationManager.class)
          .notify(10, build(c, title, body, kind, ride, false));
      TripStore.note(c, "Notification posted · " + kind);
    } catch (SecurityException e) {
      TripStore.note(c, "Notification permission denied");
    }
  }

  static List<String> items(JSONObject r) {
    JSONArray a = r.optJSONArray("items");
    List<String> names = new ArrayList<>();
    for (int i = 0; a != null && i < a.length(); i++) {
      JSONObject it = a.optJSONObject(i);
      if (it != null && !it.optBoolean("checked")) names.add(it.optString("name"));
    }
    return names;
  }

  static void deliver(Context c, JSONObject state, List<String> kinds) {
    JSONObject r = state == null ? new JSONObject() : TripEngine.obj(state, "ride");
    String kind =
        kinds.contains("before") ? "before" : kinds.contains("end") ? "end" : kinds.get(0);
    String itemText = String.join(", ", items(r));
    String title =
        switch (kind) {
          case "before" -> "Get your things ready";
          case "end" -> "Before you leave";
          case "eta" -> "Have you arrived?";
          case "tracking" -> "Check your arrival time";
          case "transit" -> TripEngine.obj(r, "transit").optString("message");
          default -> "Boothy · phone test";
        };
    String body =
        switch (kind) {
          case "before", "end" ->
              itemText.isEmpty() ? "Check the seat around you." : "Check: " + itemText + ".";
          case "eta" -> "Your estimate has passed. Confirm arrival in Boothy.";
          case "tracking" -> "Live timing has paused. Reconnect location or enter a new time.";
          case "transit" -> TripEngine.obj(r, "transit").optString("reason");
          default -> "Android scheduled this test. Tap to return.";
        };
    notice(c, title, body, kind, r.optString("id"));
    JSONObject payload = TripStore.read(c), prefs = TripEngine.obj(payload, "options");
    boolean voice = payload.optBoolean("voice") && List.of("before", "end", "eta").contains(kind);
    if (prefs.optBoolean("sound") || prefs.optBoolean("vibration") || voice) {
      try {
        c.startForegroundService(
            new Intent(c, AlertService.class)
                .putExtra("kind", kind)
                .putExtra("rideId", r.optString("id"))
                .putExtra("voice", voice ? voiceText(r, kind) : ""));
      } catch (Exception e) {
        TripStore.note(c, "Audio service could not start · notification remains available");
      }
    }
  }

  static String voiceText(JSONObject r, String kind) {
    List<String> names = items(r);
    int total = names.size();
    if (total > 4) names = names.subList(0, 4);
    String list = String.join(", ", names) + (total > 4 ? ", and your other things" : "");
    if ("eta".equals(kind)) return "Your estimated arrival time is up. "
        + (list.isEmpty() ? "Confirm whether you have arrived." : "If you're getting out, remember your " + list + ".");
    return ("end".equals(kind) ? "Before you leave. " : "You're almost there. ")
        + (list.isEmpty() ? "Check the seat around you. " : "Remember your " + list + ". ")
        + "Make sure to leave nothing behind.";
  }
}
