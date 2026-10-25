package dev.boothy.app;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.JSONObject;

public final class Alarms {
  private static long scheduledAt = Long.MIN_VALUE;

  static void consumed() {
    scheduledAt = Long.MIN_VALUE;
  }

  static boolean allowed(Context c) {
    return Build.VERSION.SDK_INT < 31
        || c.getSystemService(AlarmManager.class).canScheduleExactAlarms();
  }

  static PendingIntent intent(Context c, int id, String action) {
    return PendingIntent.getBroadcast(
        c,
        id,
        new Intent(c, AlarmReceiver.class).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static void schedule(Context c, JSONObject state) {
    AlarmManager manager = c.getSystemService(AlarmManager.class);
    PendingIntent pending = intent(c, 1, "trip");
    long next = TripEngine.nextAlarm(state, System.currentTimeMillis());
    if (next == scheduledAt && allowed(c)) return;
    manager.cancel(pending);
    scheduledAt = Long.MIN_VALUE;
    if (next == Long.MAX_VALUE) {
      scheduledAt = next;
      return;
    }
    if (!allowed(c)) {
      TripStore.note(c, "Alarm permission missing · reminders not scheduled");
      return;
    }
    try {
      manager.setAlarmClock(
          new AlarmManager.AlarmClockInfo(
              next, Alerts.open(c, "ride", TripEngine.obj(state, "ride").optString("id"))),
          pending);
      scheduledAt = next;
    } catch (SecurityException e) {
      TripStore.note(c, "Alarm permission revoked");
    }
  }

  static boolean test(Context c) {
    if (!allowed(c) || !Alerts.allowed(c)) return false;
    try {
      c.getSystemService(AlarmManager.class)
          .setAlarmClock(
              new AlarmManager.AlarmClockInfo(
                  System.currentTimeMillis() + 20000, Alerts.open(c, "test", "")),
              intent(c, 2, "test"));
      TripStore.note(c, "20-second Android test scheduled");
      return true;
    } catch (SecurityException e) {
      return false;
    }
  }

  static void cancelTest(Context c) {
    c.getSystemService(AlarmManager.class).cancel(intent(c, 2, "test"));
  }
}
