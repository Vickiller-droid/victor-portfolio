package dev.boothy.app;

import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;

import android.app.*;
import android.content.*;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;

/** Exercises Android service/notification/alarm calls without claiming physical device delivery. */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 28)
public class AndroidDeliveryTest {
  Application app;
  AlarmManager alarms;
  NotificationManager notifications;

  @Before
  public void setup() throws Exception {
    app = RuntimeEnvironment.getApplication();
    app.getSharedPreferences(TripStore.PREF, 0).edit().clear().commit();
    TripStore.clearMemoryForTest();
    Alarms.consumed();
    alarms = app.getSystemService(AlarmManager.class);
    notifications = app.getSystemService(NotificationManager.class);
    Alerts.channels(app);
    JSONObject p = new JSONObject();
    p.put("state", new TripEngineTest().initial());
    p.put("options", new JSONObject().put("sound", true).put("vibration", true));
    TripStore.init(app, p);
  }

  @Test
  public void actionableReminderAndSupportingServiceHaveDistinctRoles() {
    Notification reminder = Alerts.build(app, "Get your things ready", "Check your things", "before", "r", false);
    Notification service = Alerts.build(app, "Boothy · reminder playing", "Audio is active", "before", "r", true);
    assertEquals(Alerts.CHANNEL, reminder.getChannelId());
    assertEquals(2, reminder.actions.length);
    assertEquals("Snooze 1 min", reminder.actions[1].title.toString());
    assertEquals(Alerts.SERVICE_CHANNEL, service.getChannelId());
    assertTrue(service.actions == null || service.actions.length == 0);
    assertFalse(service.extras.getBoolean(Notification.EXTRA_SHOW_WHEN));
    assertEquals(Notification.VISIBILITY_PRIVATE, reminder.visibility);
  }

  @Test
  public void reminderRequestsDuckingInsteadOfPausingOtherMedia() throws Exception {
    shadowOf(app).grantPermissions("dev.boothy.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION");
    var controller = Robolectric.buildService(AlertService.class).create();
    var field = AlertService.class.getDeclaredField("focus");
    field.setAccessible(true);
    var request = (android.media.AudioFocusRequest) field.get(controller.get());
    assertEquals(android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
        request.getFocusGain());
    controller.destroy();
  }

  @Test
  public void startAndCancelActuallyRegisterAndRemoveAndroidAlarm() throws Exception {
    TripStore.apply(app, "depart", new JSONObject());
    assertNotNull(alarms.getNextAlarmClock());
    long at = TripStore.state(app).getJSONObject("ride").getLong("etaAt") - 180000;
    assertEquals(at, alarms.getNextAlarmClock().getTriggerTime());
    TripStore.apply(app, "cancelRide", new JSONObject());
    assertNull(alarms.getNextAlarmClock());
  }

  @Test
  public void delayedTestSurvivesWebPageAbsenceAndCanBeCancelled() {
    assertTrue(Alarms.test(app));
    assertNotNull(alarms.getNextAlarmClock());
    Alarms.cancelTest(app);
    assertNull(alarms.getNextAlarmClock());
  }

  @Test
  public void receiverPostsNotificationAndRequestsNativeAudioWithoutActivity() throws Exception {
    JSONObject p = TripStore.read(app);
    JSONObject s =
        TripEngine.apply(
                p.getJSONObject("state"),
                "depart",
                new JSONObject(),
                System.currentTimeMillis() - 13 * 60000)
            .state();
    p.put("state", s);
    TripStore.write(app, p);
    new AlarmReceiver().onReceive(app, new Intent("trip"));
    Notification n = shadowOf(notifications).getNotification(10);
    assertNotNull(n);
    assertEquals("Get your things ready", n.extras.getString(Notification.EXTRA_TITLE));
    Intent service = shadowOf(app).getNextStartedService();
    assertEquals(AlertService.class.getName(), service.getComponent().getClassName());
    assertEquals(
        "due",
        TripStore.state(app).getJSONObject("ride").getJSONObject("preArrival").getString("status"));
  }

  @Test
  public void oldNotificationCannotSnoozeNewTrip() throws Exception {
    TripStore.apply(app, "depart", new JSONObject());
    JSONObject before = TripStore.state(app);
    new AlarmReceiver().onReceive(app, new Intent("snooze").putExtra("rideId", "old"));
    assertEquals(before.toString(), TripStore.state(app).toString());
  }

  @Test
  public void restartPausesTripAndClearsAlarm() throws Exception {
    TripStore.apply(app, "depart", new JSONObject());
    new AlarmReceiver().onReceive(app, new Intent(Intent.ACTION_BOOT_COMPLETED));
    assertTrue(TripStore.state(app).getJSONObject("ride").getBoolean("needsResume"));
    assertNull(alarms.getNextAlarmClock());
    assertNotNull(shadowOf(notifications).getNotification(10));
  }

  @Test
  public void stateAndSettingsSurviveProcessMemoryLoss() throws Exception {
    TripStore.apply(app, "depart", new JSONObject());
    TripStore.apply(app, "collect", new JSONObject().put("id", 0));
    String id = TripStore.state(app).getJSONObject("ride").getString("id");
    TripStore.clearMemoryForTest();
    assertEquals(id, TripStore.state(app).getJSONObject("ride").getString("id"));
    assertTrue(
        TripStore.state(app)
            .getJSONObject("ride")
            .getJSONArray("items")
            .getJSONObject(0)
            .getBoolean("checked"));
    assertTrue(TripStore.read(app).getJSONObject("options").getBoolean("sound"));
  }
}
