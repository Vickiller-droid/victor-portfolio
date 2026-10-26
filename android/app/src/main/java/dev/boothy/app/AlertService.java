package dev.boothy.app;

import android.app.*;
import android.content.*;
import android.media.*;
import android.os.*;
import android.speech.tts.*;
import androidx.core.content.ContextCompat;
import java.util.*;
import org.json.JSONObject;

public class AlertService extends Service {
  private final Handler handler = new Handler(Looper.getMainLooper());
  private AudioTrack track;
  private TextToSpeech speech;
  private AudioManager manager;
  private AudioFocusRequest focus;
  private PowerManager.WakeLock wake;
  private boolean registered, destroyed, continueTone;
  private String words = "";
  private int generation;
  private final AudioAttributes attributes =
      new AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build();
  private final BroadcastReceiver noisy =
      new BroadcastReceiver() {
        public void onReceive(Context c, Intent i) {
          TripStore.note(c, "Audio stopped · headphones disconnected");
          stopSelf();
        }
      };

  @Override
  public void onCreate() {
    super.onCreate();
    Alerts.channels(this);
    manager = getSystemService(AudioManager.class);
    focus =
        new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(attributes)
            .setOnAudioFocusChangeListener(
                change -> {
                  if (change < 0) {
                    TripStore.note(this, "Audio interrupted · focus lost");
                    stopSelf();
                  }
                },
                handler)
            .build();
    ContextCompat.registerReceiver(
        this,
        noisy,
        new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
        ContextCompat.RECEIVER_NOT_EXPORTED);
    registered = true;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      stopSelf();
      return START_NOT_STICKY;
    }
    generation++;
    int token = generation;
    handler.removeCallbacksAndMessages(null);
    stopPlayers();
    String kind = intent.getStringExtra("kind"), ride = intent.getStringExtra("rideId");
    startForeground(
        11,
        Alerts.build(
            this,
            "Boothy reminder",
            "Tap to check your things.",
            kind == null ? "test" : kind,
            ride == null ? "" : ride,
            true));
    wake =
        getSystemService(PowerManager.class)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Boothy:boundedReminder");
    wake.acquire(40000);
    handler.postDelayed(this::stopSelf, 35000);
    JSONObject prefs = TripEngine.obj(TripStore.read(this), "options");
    if (prefs.optBoolean("vibration")) {
      Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
      if (v != null && v.hasVibrator()) {
        v.vibrate(VibrationEffect.createWaveform(new long[] {0, 350, 150, 350, 500, 350}, -1));
        TripStore.note(this, "Vibration requested");
      }
    }
    words = intent.getStringExtra("voice");
    if (words == null) words = "";
    boolean preview = intent.getBooleanExtra("voicePreview", false);
    if (!prefs.optBoolean("sound") && words.isEmpty()) {
      handler.postDelayed(this::stopSelf, 1800);
      return START_NOT_STICKY;
    }
    if (manager.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      TripStore.note(this, "Audio focus denied · notification available");
      handler.postDelayed(this::stopSelf, 1800);
      return START_NOT_STICKY;
    }
    continueTone = prefs.optBoolean("sound") && !preview && !words.isBlank();
    if (prefs.optBoolean("sound") && !preview) {
      playTone(prefs.optString("tone", "chime"));
      handler.postDelayed(
          () -> {
            if (token != generation) return;
            releaseTrack();
            speakOrFinish();
          },
          words.isBlank() ? 15000 : 1200);
    } else speakOrFinish();
    return START_NOT_STICKY;
  }

  private void playTone(String tone) {
    try {
      int rate = 22050, count = rate * 15;
      short[] pcm = new short[count];
      double[] notes =
          switch (tone) {
            case "ripple" -> new double[] {523, 659, 784, 1047};
            case "bright" -> new double[] {880, 660, 880, 1175};
            default -> new double[] {659, 831, 988, 831};
          };
      double beat = "ripple".equals(tone) ? .65 : "bright".equals(tone) ? .35 : .5;
      for (int n = 0; n < count; n++) {
        double t = n / (double) rate,
            w = t % beat,
            fade = Math.min(1, w / .025) * Math.max(0, 1 - w / (beat * .85));
        pcm[n] =
            (short)
                (Math.sin(2 * Math.PI * notes[(int) (t / beat) % notes.length] * t) * 7000 * fade);
      }
      track =
          new AudioTrack.Builder()
              .setAudioAttributes(attributes)
              .setAudioFormat(
                  new AudioFormat.Builder()
                      .setSampleRate(rate)
                      .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                      .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                      .build())
              .setTransferMode(AudioTrack.MODE_STATIC)
              .setBufferSizeInBytes(count * 2)
              .build();
      track.write(pcm, 0, count);
      track.play();
      TripStore.note(this, "Reminder tone playback started");
    } catch (Exception e) {
      TripStore.note(this, "Tone playback failed");
    }
  }

  private void speakOrFinish() {
    if (words.isBlank()) {
      stopSelf();
      return;
    }
    final int token = generation;
    speech =
        new TextToSpeech(
            this,
            status -> handler.post(() -> {
              if (destroyed || token != generation || speech == null) return;
              if (status != TextToSpeech.SUCCESS) {
                TripStore.note(this, "Speech engine unavailable · tone fallback");
                finishSpeech();
                return;
              }
              speech.setAudioAttributes(attributes);
              if (speech.setLanguage(Locale.UK) < 0) {
                TripStore.note(this, "English voice is not installed · tone fallback");
                finishSpeech();
                return;
              }
              speech.setSpeechRate(.92f);
              speech.setOnUtteranceProgressListener(
                  new UtteranceProgressListener() {
                    public void onStart(String id) {
                      TripStore.note(AlertService.this, "Voice playback started");
                    }

                    public void onDone(String id) {
                      handler.post(
                          () -> {
                            if (token == generation) finishSpeech();
                          });
                    }

                    public void onError(String id) {
                      TripStore.note(AlertService.this, "Voice playback failed");
                      handler.post(
                          () -> {
                            if (token == generation) stopSelf();
                          });
                    }
                  });
              if (speech.speak(words, TextToSpeech.QUEUE_FLUSH, null, "boothy-reminder")
                  != TextToSpeech.SUCCESS) {
                TripStore.note(this, "Voice request failed");
                stopSelf();
              }
            }));
  }

  private void finishSpeech() {
    if (continueTone) {
      continueTone = false;
      playTone(TripEngine.obj(TripStore.read(this), "options").optString("tone", "chime"));
      handler.postDelayed(this::stopSelf, 12000);
    } else stopSelf();
  }

  private void releaseTrack() {
    if (track != null) {
      try {
        track.stop();
      } catch (Exception ignored) {
      }
      track.release();
      track = null;
    }
  }

  private void stopPlayers() {
    releaseTrack();
    if (speech != null) {
      speech.stop();
      speech.shutdown();
      speech = null;
    }
    if (wake != null && wake.isHeld()) wake.release();
  }

  @Override
  public void onDestroy() {
    destroyed = true;
    generation++;
    handler.removeCallbacksAndMessages(null);
    stopPlayers();
    if (manager != null && focus != null) manager.abandonAudioFocusRequest(focus);
    Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
    if (v != null) v.cancel();
    if (registered) unregisterReceiver(noisy);
    stopForeground(STOP_FOREGROUND_REMOVE);
    super.onDestroy();
  }

  @Override
  public IBinder onBind(Intent i) {
    return null;
  }
}
