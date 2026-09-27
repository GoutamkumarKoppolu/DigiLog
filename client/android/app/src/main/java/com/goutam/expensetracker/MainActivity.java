package com.goutam.expensetracker;

import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup.MarginLayoutParams;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before super.onCreate().
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(FileViewerPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;
        keepWebViewAboveKeyboard(webView);
        routeBackButtonToApp(webView);
        turnOffAutofill(webView);
    }

    /**
     * Android's autofill offered past entries (e.g. old tags) as chips in the
     * keyboard's suggestion strip while typing names. Nothing in this app should
     * be autofilled, so the WebView and everything in it opt out. The web side
     * also sets autoComplete="off" on every form and search box.
     */
    private void turnOffAutofill(WebView webView) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        }
    }

    /**
     * Android 15 draws apps edge-to-edge and no longer shrinks them for the
     * keyboard, so bottom sheets ended up under it. Capacitor
     * (adjustMarginsForEdgeToEdge: "auto") only keeps the WebView clear of
     * the system bars; this replaces its listener with one that does the same
     * and also lifts the bottom edge above the keyboard while it's open.
     */
    private void keepWebViewAboveKeyboard(WebView webView) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM || optedOutOfEdgeToEdge()) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            MarginLayoutParams mlp = (MarginLayoutParams) v.getLayoutParams();
            mlp.leftMargin = bars.left;
            mlp.topMargin = bars.top;
            mlp.rightMargin = bars.right;
            mlp.bottomMargin = Math.max(bars.bottom, ime.bottom);
            v.setLayoutParams(mlp);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    // Same check Capacitor makes before applying its edge-to-edge margins.
    private boolean optedOutOfEdgeToEdge() {
        TypedValue value = new TypedValue();
        boolean found = getTheme().resolveAttribute(android.R.attr.windowOptOutEdgeToEdgeEnforcement, value, true);
        return found && value.data != 0;
    }

    /**
     * Without this, Back closes the app from any page. The web app decides
     * instead (window.appHandleBack in app/useBackButton.js): close the open
     * sheet, or go up one level. It returns false on Home, and then Back
     * leaves the app as usual.
     */
    private void routeBackButtonToApp(WebView webView) {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                webView.evaluateJavascript("(window.appHandleBack ? window.appHandleBack() : false)", result -> {
                    if ("true".equals(result)) return;
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                });
            }
        });
    }
}
