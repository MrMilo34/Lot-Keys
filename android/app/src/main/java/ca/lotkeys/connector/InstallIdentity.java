package ca.lotkeys.connector;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.security.SecureRandom;

final class InstallIdentity {
    private static final String PREFS = "lotkeys-connector";

    static String id(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String id = prefs.getString("installId", "");
        if (!id.isEmpty()) return id;
        byte[] bytes = new byte[18];
        new SecureRandom().nextBytes(bytes);
        id = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);
        prefs.edit().putString("installId", id).commit();
        return id;
    }

    static String token(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String token = prefs.getString("browserToken", "");
        if (!token.isEmpty()) return token;
        return rotateToken(context);
    }

    static String rotateToken(Context context) {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String token = Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("browserToken", token).commit();
        return token;
    }

    private InstallIdentity() {}
}
