package dev.boothy.app;

import static org.junit.Assert.*;

import java.nio.charset.StandardCharsets;
import org.json.*;
import org.junit.Test;

public class TripEngineTest {
  static final long NOW = 2000000000000L;

  JSONObject initial() throws Exception {
    return new JSONObject(
        new String(
            getClass().getResourceAsStream("/initial-state.json").readAllBytes(),
            StandardCharsets.UTF_8));
  }

  JSONObject data(Object... args) throws Exception {
    JSONObject d = new JSONObject();
    for (int i = 0; i < args.length; i += 2) d.put((String) args[i], args[i + 1]);
    return d;
  }

  JSONObject ride() throws Exception {
    JSONObject s = initial();
    s.getJSONObject("config")
        .put("duration", 10)
        .put("destinationPoint", data("lat", 9.1, "lng", 7.4));
    return TripEngine.apply(s, "depart", data(), NOW).state();
  }

  JSONObject r(JSONObject s) throws Exception {
    return s.getJSONObject("ride");
  }

  JSONObject pre(JSONObject s) throws Exception {
    return r(s).getJSONObject("preArrival");
  }

  TripEngine.Result tick(JSONObject s, long seconds) throws Exception {
    return TripEngine.apply(s, "tick", data(), NOW + seconds * 1000);
  }

  TripEngine.Result route(JSONObject s, long at, double seconds) throws Exception {
    return TripEngine.apply(
        s,
        "updateRouteEta",
        data(
            "rideId",
            r(s).getString("id"),
            "seconds",
            seconds,
            "observedAt",
            NOW + at * 1000,
            "destinationPoint",
            data("lat", 9.1, "lng", 7.4)),
        NOW + at * 1000);
  }

  @Test
  public void schedulesThreeMinuteWarning() throws Exception {
    JSONObject s = ride();
    assertEquals(NOW + 420000, TripEngine.nextAlarm(s, NOW));
    assertFalse(tick(s, 419).alerts().contains("before"));
    assertTrue(tick(s, 420).alerts().contains("before"));
  }

  @Test
  public void lateWakeDoesNotReplayEveryMissedAlert() throws Exception {
    TripEngine.Result x = tick(ride(), 900);
    assertEquals(java.util.List.of("before"), x.alerts());
    assertTrue(tick(x.state(), 901).alerts().isEmpty());
  }

  @Test
  public void ignoredWarningRepeatsOnlyOnce() throws Exception {
    JSONObject s = tick(ride(), 420).state();
    assertTrue(tick(s, 479).alerts().isEmpty());
    TripEngine.Result x = tick(s, 480);
    assertEquals(java.util.List.of("before"), x.alerts());
    assertFalse(tick(x.state(), 540).alerts().contains("before"));
  }

  @Test
  public void snoozeIsOneMinuteAndDoesNotCheckItems() throws Exception {
    JSONObject s = tick(ride(), 420).state();
    s = TripEngine.apply(s, "snoozePreArrival", data(), NOW + 430000).state();
    assertEquals(NOW + 490000, TripEngine.nextAlarm(s, NOW + 430000));
    assertFalse(r(s).getJSONArray("items").getJSONObject(0).getBoolean("checked"));
    assertTrue(tick(s, 489).alerts().isEmpty());
    assertTrue(tick(s, 490).alerts().contains("before"));
  }

  @Test
  public void interactionCancelsAutomaticRepeat() throws Exception {
    JSONObject s = tick(ride(), 420).state();
    s = TripEngine.apply(s, "interactReminder", data(), NOW + 421000).state();
    assertFalse(tick(s, 480).alerts().contains("before"));
  }

  @Test
  public void trafficDelayReschedulesUndeliveredWarning() throws Exception {
    JSONObject s = route(ride(), 400, 600).state();
    assertEquals(NOW + 1000000, r(s).getLong("etaAt"));
    assertFalse(tick(s, 420).alerts().contains("before"));
    assertEquals(NOW + 490001, TripEngine.nextAlarm(s, NOW + 400000));
  }

  @Test
  public void earlyArrivalRouteWarnsImmediately() throws Exception {
    TripEngine.Result x = route(ride(), 100, 120);
    assertTrue(x.alerts().contains("before"));
    assertEquals(NOW + 220000, r(x.state()).getLong("etaAt"));
  }

  @Test
  public void staleGpsPausesArrivalWarnings() throws Exception {
    JSONObject s = route(ride(), 0, 300).state();
    TripEngine.Result x = tick(s, 91);
    assertEquals(java.util.List.of("tracking"), x.alerts());
    assertTrue(tick(x.state(), 300).alerts().isEmpty());
    assertFalse(r(x.state()).getBoolean("etaReached"));
    assertEquals(Long.MAX_VALUE, TripEngine.nextAlarm(x.state(), NOW + 91000));
  }

  @Test
  public void staleGpsDoesNotPreventExplicitSnooze() throws Exception {
    JSONObject s = route(ride(), 0, 100).state();
    s = TripEngine.apply(s, "snoozePreArrival", data(), NOW + 50000).state();
    assertTrue(tick(s, 110).alerts().contains("before"));
  }

  @Test
  public void recoveryRestoresRouteTiming() throws Exception {
    JSONObject s = tick(route(ride(), 0, 300).state(), 91).state();
    TripEngine.Result x = route(s, 120, 170);
    assertFalse(r(x.state()).getBoolean("trackingWarningSent"));
    assertTrue(x.alerts().contains("before"));
  }

  @Test
  public void outOfOrderOrDuplicateResponsesAreIgnored() throws Exception {
    JSONObject s = route(ride(), 60, 600).state();
    long eta = r(s).getLong("etaAt");
    for (long at : new long[] {0, 60}) {
      JSONObject d =
          data("rideId", r(s).getString("id"), "seconds", 60, "observedAt", NOW + at * 1000);
      assertEquals(
          eta, r(TripEngine.apply(s, "updateRouteEta", d, NOW + 61000).state()).getLong("etaAt"));
    }
  }

  @Test
  public void previousTripOrDestinationCannotChangeTiming() throws Exception {
    JSONObject s = ride();
    long eta = r(s).getLong("etaAt");
    JSONObject d = data("rideId", "old", "seconds", 1, "observedAt", NOW);
    assertEquals(eta, r(TripEngine.apply(s, "updateRouteEta", d, NOW).state()).getLong("etaAt"));
    d.put("rideId", r(s).getString("id")).put("destinationPoint", data("lat", 1, "lng", 2));
    assertEquals(eta, r(TripEngine.apply(s, "updateRouteEta", d, NOW).state()).getLong("etaAt"));
  }

  @Test
  public void delayedNetworkResponseIsRejected() throws Exception {
    JSONObject s = ride();
    JSONObject d = data("rideId", r(s).getString("id"), "seconds", 1, "observedAt", NOW);
    assertEquals(
        r(s).getLong("etaAt"),
        r(TripEngine.apply(s, "updateRouteEta", d, NOW + 46000).state()).getLong("etaAt"));
  }

  @Test
  public void acknowledgedWarningIsNotRearmedByRouteRefresh() throws Exception {
    JSONObject s = tick(ride(), 420).state();
    s = TripEngine.apply(s, "ackPreArrival", data(), NOW + 421000).state();
    assertEquals("done", pre(route(s, 430, 600).state()).getString("status"));
  }

  @Test
  public void cancellationRemovesEveryScheduledAlarm() throws Exception {
    JSONObject s = TripEngine.apply(ride(), "cancelRide", data(), NOW + 1000).state();
    assertEquals(Long.MAX_VALUE, TripEngine.nextAlarm(s, NOW + 1000));
    assertTrue(tick(s, 9999).alerts().isEmpty());
  }

  @Test
  public void timePassingDoesNotConfirmArrival() throws Exception {
    JSONObject s = tick(ride(), 600).state();
    assertEquals("inTransit", r(s).getString("stage"));
    assertTrue(r(s).getBoolean("etaReached"));
  }

  @Test
  public void checkedItemsSurviveArrivalAndRestore() throws Exception {
    JSONObject s = TripEngine.apply(ride(), "collect", data("id", 0), NOW).state();
    s = new JSONObject(s.toString());
    s = TripEngine.apply(s, "arrive", data(), NOW + 1000).state();
    assertTrue(r(s).getJSONArray("items").getJSONObject(0).getBoolean("checked"));
    assertFalse(r(s).getJSONArray("items").getJSONObject(1).getBoolean("checked"));
  }

  @Test
  public void manualFallbackRequiresFreshEnteredTime() throws Exception {
    JSONObject s = route(ride(), 0, 300).state();
    s = TripEngine.apply(s, "useManualEta", data(), NOW + 50000).state();
    assertFalse(TripEngine.routeFresh(r(s), NOW + 50000));
    s = TripEngine.apply(s, "updateEta", data("minutes", 7), NOW + 60000).state();
    assertEquals("manual", r(s).getString("etaSource"));
    assertEquals(NOW + 480000, r(s).getLong("etaAt"));
    assertTrue(TripEngine.routeFresh(r(s), NOW + 60000));
  }

  @Test
  public void rebootPausedTripRequiresResume() throws Exception {
    JSONObject s = ride();
    r(s).put("needsResume", true);
    assertTrue(tick(s, 900).alerts().isEmpty());
    assertEquals(Long.MAX_VALUE, TripEngine.nextAlarm(s, NOW + 900000));
    s = TripEngine.apply(s, "updateEta", data("minutes", 5), NOW + 900000).state();
    assertFalse(r(s).getBoolean("needsResume"));
    assertEquals(NOW + 1020000, TripEngine.nextAlarm(s, NOW + 900000));
  }

  @Test
  public void transitReminderWorksEvenWhenGpsIsStale() throws Exception {
    JSONObject s = ride();
    r(s).getJSONObject("transit").put("status", "scheduled").put("at", 2);
    s = route(s, 0, 600).state();
    assertTrue(tick(s, 120).alerts().contains("transit"));
  }
}
