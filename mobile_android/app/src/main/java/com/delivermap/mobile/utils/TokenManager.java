package com.delivermap.mobile.utils;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Stocke et lit les tokens JWT dans SharedPreferences.
 */
public class TokenManager {

    private static final String PREFS = "delivermap_prefs";
    private static final String KEY_ACCESS  = "access_token";
    private static final String KEY_REFRESH = "refresh_token";
    private static final String KEY_ROLE    = "user_role";
    private static final String KEY_USERNAME = "username";

    public static void saveTokens(Context ctx, String access, String refresh) {
        prefs(ctx).edit()
            .putString(KEY_ACCESS, access)
            .putString(KEY_REFRESH, refresh)
            .apply();
    }

    public static void saveUserInfo(Context ctx, String role, String username) {
        prefs(ctx).edit()
            .putString(KEY_ROLE, role)
            .putString(KEY_USERNAME, username)
            .apply();
    }

    public static String getAccessToken(Context ctx) {
        return prefs(ctx).getString(KEY_ACCESS, null);
    }

    public static String getRefreshToken(Context ctx) {
        return prefs(ctx).getString(KEY_REFRESH, null);
    }

    public static String getRole(Context ctx) {
        return prefs(ctx).getString(KEY_ROLE, null);
    }

    public static String getUsername(Context ctx) {
        return prefs(ctx).getString(KEY_USERNAME, null);
    }

    public static boolean isLoggedIn(Context ctx) {
        String token = getAccessToken(ctx);
        return token != null && !token.isEmpty();
    }

    public static void clear(Context ctx) {
        prefs(ctx).edit().clear().apply();
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
