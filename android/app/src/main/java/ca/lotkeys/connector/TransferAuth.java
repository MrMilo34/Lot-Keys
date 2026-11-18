package ca.lotkeys.connector;

import android.accounts.Account;
import android.content.Context;
import com.google.android.gms.auth.GoogleAuthUtil;

/** Upload access is separately consented; pairing's existing app-data grant is unchanged. */
final class TransferAuth {
    static final String SCOPE = "oauth2:https://www.googleapis.com/auth/drive";
    static String account(Context context) { return context.getSharedPreferences("lotkeys-transfer-auth", Context.MODE_PRIVATE).getString("account", ""); }
    static boolean ready(Context context) { String account = account(context); return !account.isEmpty() && account.equalsIgnoreCase(DriveRelay.account(context)); }
    static String authorize(Context context, Account account) throws Exception {
        TransferStore.require(account.name.equalsIgnoreCase(DriveRelay.account(context)), "Use the same Google account as the phone connection.");
        String token = GoogleAuthUtil.getToken(context, account, SCOPE);
        context.getSharedPreferences("lotkeys-transfer-auth", Context.MODE_PRIVATE).edit().putString("account", account.name).commit();
        return token;
    }
    static String token(Context context, String account) throws Exception {
        if (!ready(context) || !account.equalsIgnoreCase(account(context))) throw new AuthRequired("Open the Android setup to approve this account's background uploads.");
        try { return GoogleAuthUtil.getToken(context, new Account(account(context), "com.google"), SCOPE); }
        catch (com.google.android.gms.auth.UserRecoverableAuthException error) { throw new AuthRequired("Open the Android setup to restore Google Drive upload access."); }
    }
    static final class AuthRequired extends Exception { AuthRequired(String message) { super(message); } }
}
