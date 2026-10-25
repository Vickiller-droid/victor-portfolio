package dev.boothy.app;

import android.content.Context;
import android.content.pm.*;
import android.os.Build;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.json.*;

public final class RouteClient {
  record Estimate(double seconds, double meters) {}

  static JSONObject waypoint(double lat, double lng) {
    JSONObject ll = new JSONObject(), p = new JSONObject(), w = new JSONObject();
    TripEngine.put(ll, "latitude", lat);
    TripEngine.put(ll, "longitude", lng);
    TripEngine.put(p, "latLng", ll);
    TripEngine.put(w, "location", p);
    return w;
  }

  static String certificate(Context c) throws Exception {
    PackageInfo p =
        c.getPackageManager()
            .getPackageInfo(
                c.getPackageName(),
                Build.VERSION.SDK_INT >= 28
                    ? PackageManager.GET_SIGNING_CERTIFICATES
                    : PackageManager.GET_SIGNATURES);
    Signature[] signatures =
        Build.VERSION.SDK_INT >= 28 ? p.signingInfo.getApkContentsSigners() : p.signatures;
    byte[] bytes = MessageDigest.getInstance("SHA-1").digest(signatures[0].toByteArray());
    StringBuilder out = new StringBuilder();
    for (byte b : bytes) out.append(String.format(java.util.Locale.US, "%02X", b));
    return out.toString();
  }

  static Estimate fetch(Context c, double lat, double lng, JSONObject point) throws Exception {
    if (BuildConfig.MAPS_KEY.isBlank()) throw new IOException("Routing not configured");
    HttpURLConnection conn =
        (HttpURLConnection)
            new URL("https://routes.googleapis.com/directions/v2:computeRoutes").openConnection();
    try {
      conn.setConnectTimeout(10000);
      conn.setReadTimeout(12000);
      conn.setInstanceFollowRedirects(false);
      conn.setRequestMethod("POST");
      conn.setDoOutput(true);
      conn.setRequestProperty("Content-Type", "application/json");
      conn.setRequestProperty("X-Goog-Api-Key", BuildConfig.MAPS_KEY);
      conn.setRequestProperty("X-Goog-FieldMask", "routes.duration,routes.distanceMeters");
      conn.setRequestProperty("X-Android-Package", c.getPackageName());
      conn.setRequestProperty("X-Android-Cert", certificate(c));
      JSONObject body = new JSONObject();
      body.put("origin", waypoint(lat, lng));
      body.put("destination", waypoint(point.getDouble("lat"), point.getDouble("lng")));
      body.put("travelMode", "DRIVE");
      body.put("routingPreference", "TRAFFIC_AWARE");
      try (OutputStream out = conn.getOutputStream()) {
        out.write(body.toString().getBytes(StandardCharsets.UTF_8));
      }
      if (conn.getResponseCode() != 200) throw new IOException("Route unavailable");
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      try (InputStream in = conn.getInputStream()) {
        byte[] buffer = new byte[4096];
        int n;
        while ((n = in.read(buffer)) != -1) {
          if (bytes.size() + n > 65536) throw new IOException("Route response too large");
          bytes.write(buffer, 0, n);
        }
      }
      JSONObject route =
          new JSONObject(bytes.toString("UTF-8")).getJSONArray("routes").getJSONObject(0);
      String duration = route.getString("duration");
      if (!duration.endsWith("s")) throw new IOException("Invalid duration");
      double seconds = Double.parseDouble(duration.substring(0, duration.length() - 1)),
          meters = route.getDouble("distanceMeters");
      if (!Double.isFinite(seconds)
          || seconds < 0
          || seconds > 86400
          || !Double.isFinite(meters)
          || meters < 0) throw new IOException("Invalid estimate");
      return new Estimate(seconds, meters);
    } finally {
      conn.disconnect();
    }
  }
}
