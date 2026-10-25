package dev.boothy.app;

import android.content.*;
import org.json.JSONObject;

public class AlarmReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context c, Intent intent) {
    String action = intent.getAction();
    if ("test".equals(action)) {
      TripStore.note(c, "Android test alarm received");
      Alerts.deliver(c, TripStore.state(c), java.util.List.of("test"));
      return;
    }
    JSONObject s = TripStore.state(c);
    if (s == null) return;
    JSONObject r = TripEngine.obj(s, "ride");
    if ("stopSound".equals(action) || "snooze".equals(action)) {
      if (!r.optString("id").equals(intent.getStringExtra("rideId"))) return;
      TripStore.apply(
          c, "snooze".equals(action) ? "snoozePreArrival" : "interactReminder", new JSONObject());
      return;
    }
    if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)) {
      if (TripEngine.active(r)) {
        TripEngine.put(r, "needsResume", true);
        TripEngine.put(r, "routePaused", true);
        TripEngine.put(r, "routeRequested", false);
        TripEngine.put(r, "trackingWarningSent", true);
        TripEngine.put(TripEngine.obj(r, "preArrival"), "interacted", true);
        JSONObject p = TripStore.read(c);
        TripEngine.put(p, "state", s);
        TripStore.write(c, p);
        c.stopService(new Intent(c, TripLocationService.class));
        Alarms.consumed();
        Alarms.schedule(c, s);
        TripStore.note(c, "Phone restarted or clock changed · check trip time");
        Alerts.notice(
            c,
            "Trip time needs checking",
            "Open Boothy and enter your new arrival time.",
            "tracking",
            r.optString("id"));
        MainActivity.publish(c);
      }
      return;
    }
    Alarms.consumed();
    TripStore.note(c, "Android trip alarm received");
    TripStore.apply(c, "tick", new JSONObject());
  }
}
