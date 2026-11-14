package br.com.braiantech.reinopequeno;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;

/**
 * Reino Pequeno for Android: a full-screen WebView that runs the game kept in the app (assets/index.html).
 * AndroidTTS lends the phone's own voices to the characters; AndroidStore keeps the newest version of the game
 * downloaded by the "Procurar atualização" button, so the app updates itself without a new APK.
 */
public class MainActivity extends Activity {
    static final String START = "file:///android_asset/index.html";
    WebView web;
    TextToSpeech tts;
    volatile boolean ttsOk = false;
    long backT = 0;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Tts(), "AndroidTTS");
        web.addJavascriptInterface(new Store(), "AndroidStore");
        setContentView(web);
        immersive();
        if (Build.VERSION.SDK_INT >= 19) getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(new View.OnSystemUiVisibilityChangeListener() {
            public void onSystemUiVisibilityChange(int v) { if ((v & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) ui.postDelayed(hideBars, 2500); }
        });
        web.loadUrl(START);
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status != TextToSpeech.SUCCESS) return;
                int r = tts.setLanguage(new Locale("pt", "BR"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) r = tts.setLanguage(new Locale("pt"));
                ttsOk = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) {}
                    @Override public void onDone(String id) { done(id); }
                    @Override public void onError(String id) { done(id); }
                });
            }
        });
    }

    void done(final String id) {
        runOnUiThread(new Runnable() {
            public void run() { js("window.__ttsDone&&window.__ttsDone(" + JSONQuote(id) + ")"); }
        });
    }

    static String JSONQuote(String s) { return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"; }

    void js(String code) { if (web != null) web.evaluateJavascript(code, null); }

    void immersive() {
        if (Build.VERSION.SDK_INT >= 19) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) { immersive(); later(); } }

    final Handler ui = new Handler(Looper.getMainLooper());
    final Runnable hideBars = new Runnable() { public void run() { immersive(); } };
    /** After the lock screen the system bars can come back over the game: hide them again a little later,
     *  and tell the page to measure its layout again. */
    void later() {
        ui.postDelayed(hideBars, 300);
        ui.postDelayed(hideBars, 1200);
        ui.postDelayed(new Runnable() { public void run() { js("window.__relayout&&window.__relayout()"); } }, 400);
    }

    @Override
    protected void onPause() {
        js("window.__appPause&&window.__appPause(true)");
        if (tts != null) tts.stop();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        immersive();
        later();
        js("window.__appPause&&window.__appPause(false)");
    }

    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - backT < 2000) { finish(); return; }
        backT = now;
        js("window.__appPause&&window.__appPause(true)");
        Toast.makeText(this, "Jogo pausado. Toque em Voltar de novo para sair.", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** The phone's voices for the characters. */
    class Tts {
        @JavascriptInterface public boolean ok() { return ttsOk; }
        @JavascriptInterface public boolean busy() { return tts != null && tts.isSpeaking(); }
        @JavascriptInterface public void stop() { if (tts != null) tts.stop(); }
        @JavascriptInterface public void speak(String text, float rate, float pitch, int id) {
            if (!ttsOk) return;
            tts.setSpeechRate(rate);
            tts.setPitch(pitch);
            if (Build.VERSION.SDK_INT >= 21) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, String.valueOf(id));
            } else {
                HashMap<String, String> p = new HashMap<String, String>();
                p.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, String.valueOf(id));
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, p);
            }
        }
    }

    /** The newest version of the game downloaded by the update button. */
    class Store {
        File game() { return new File(getFilesDir(), "jogo.html"); }
        File ver() { return new File(getFilesDir(), "versao.txt"); }

        @JavascriptInterface public int version() {
            try { if (!game().exists()) return 0; return Integer.parseInt(read(ver()).trim()); } catch (Exception e) { return 0; }
        }
        @JavascriptInterface public String load() {
            try { return read(game()); } catch (Exception e) { return ""; }
        }
        @JavascriptInterface public boolean save(int v, String html) {
            try {
                File tmp = new File(getFilesDir(), "jogo.tmp");
                write(tmp, html);
                File g = game();
                if (g.exists() && !g.delete()) return false;
                if (!tmp.renameTo(g)) return false;
                write(ver(), String.valueOf(v));
                return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface public void clear() { game().delete(); ver().delete(); }
        @JavascriptInterface public void restart() {
            runOnUiThread(new Runnable() { public void run() { if (web != null) web.loadUrl(START); } });
        }
    }

    static String read(File f) throws Exception {
        InputStream in = new FileInputStream(f);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[65536];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            return out.toString("UTF-8");
        } finally { in.close(); }
    }

    static void write(File f, String s) throws Exception {
        OutputStream out = new FileOutputStream(f);
        try { out.write(s.getBytes("UTF-8")); } finally { out.close(); }
    }
}
