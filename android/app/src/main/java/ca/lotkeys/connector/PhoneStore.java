package ca.lotkeys.connector;

import android.Manifest;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.Telephony;
import android.telephony.SmsManager;
import android.telephony.SubscriptionManager;
import android.util.Base64;

import androidx.core.content.FileProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/** Read-only SMS/MMS access, explicit SMS sending, and reviewed native media handoff. */
final class PhoneStore {
    static final int PAGE_SIZE = 40;
    private static final long SEND_LEDGER_MAX_AGE = 7L * 24 * 60 * 60 * 1000;
    private final Context context;
    private final ContentResolver resolver;

    PhoneStore(Context context) {
        this.context = context.getApplicationContext();
        this.resolver = this.context.getContentResolver();
    }

    boolean canReadMessages() {
        return context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    boolean canSendMessages() {
        return context.checkSelfPermission(Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    boolean canReadContacts() {
        return context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED;
    }

    private void requireRead() {
        if (!canReadMessages()) throw new SecurityException("Allow Messages access in the LotKeys Android setup.");
    }

    String sourceApp() {
        String packageName = Telephony.Sms.getDefaultSmsPackage(context);
        if (packageName == null) return "Default SMS app not selected";
        try {
            return String.valueOf(context.getPackageManager().getApplicationLabel(
                context.getPackageManager().getApplicationInfo(packageName, 0)));
        } catch (Exception ignored) {
            return packageName;
        }
    }

    JSONObject status(long revision, int port) throws Exception {
        return new JSONObject()
            .put("version", "0.9.5.12")
            .put("deviceId", InstallIdentity.id(context))
            .put("deviceName", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL)
            .put("sourceApp", sourceApp())
            .put("revision", revision)
            .put("port", port)
            .put("permissions", new JSONObject()
                .put("readSms", canReadMessages())
                .put("sendSms", canSendMessages())
                .put("contacts", canReadContacts()))
            .put("capabilities", new JSONObject()
                .put("smsHistory", canReadMessages())
                .put("mmsHistory", canReadMessages())
                .put("smsSend", canSendMessages())
                .put("mmsSend", false)
                .put("mediaHandoff", true)
                .put("attachments", canReadMessages())
                .put("rcs", false)
                .put("contactNames", canReadContacts()));
    }

    private Uri threadsUri() {
        return Telephony.Threads.CONTENT_URI.buildUpon().appendQueryParameter("simple", "true").build();
    }

    JSONObject conversations(int offset) throws Exception {
        requireRead();
        offset = Math.max(0, Math.min(offset, 100000));
        JSONArray rows = new JSONArray();
        int total;
        try (Cursor cursor = resolver.query(
            threadsUri(), null, "message_count > 0", null, "date DESC, _id DESC")) {
            if (cursor == null) throw new IOException("Android did not return its SMS/MMS conversation index.");
            total = cursor.getCount();
            if (offset < total && cursor.moveToPosition(offset)) {
                do {
                    rows.put(thread(cursor));
                } while (rows.length() < PAGE_SIZE && cursor.moveToNext());
            }
        }
        return new JSONObject()
            .put("threads", rows)
            .put("offset", offset)
            .put("nextOffset", offset + rows.length())
            .put("total", total)
            .put("hasMore", offset + rows.length() < total)
            .put("sourceApp", sourceApp());
    }

    JSONObject details(String id) throws Exception {
        requireRead();
        long threadId = threadNumber(id);
        try (Cursor cursor = resolver.query(
            threadsUri(), null, "_id = ?", new String[]{String.valueOf(threadId)}, null)) {
            if (cursor != null && cursor.moveToFirst()) return thread(cursor);
        }
        throw new IOException("This conversation is no longer in the phone's SMS/MMS database.");
    }

    JSONObject history(String threadId, JSONObject before) throws Exception {
        requireRead();
        long numericThreadId = threadNumber(threadId);
        List<JSONObject> messages = new ArrayList<>();
        long beforeAt = before == null ? Long.MAX_VALUE : before.optLong("at", Long.MAX_VALUE);

        try (Cursor cursor = resolver.query(
            Telephony.Sms.CONTENT_URI,
            new String[]{"_id", "body", "date", "type", "status", "address", "read"},
            "thread_id = ? AND type != 3 AND date <= ?",
            new String[]{String.valueOf(numericThreadId), String.valueOf(beforeAt)},
            "date DESC, _id DESC")) {
            if (cursor == null) throw new IOException("SMS history is unavailable.");
            int count = 0;
            while (cursor.moveToNext() && count < PAGE_SIZE + 1) {
                long id = number(cursor, "_id");
                long type = number(cursor, "type");
                JSONObject message = new JSONObject()
                    .put("id", "sms-" + id)
                    .put("sort", orderKey("sms", id))
                    .put("text", clip(string(cursor, "body"), 16000))
                    .put("at", number(cursor, "date"))
                    .put("outgoing", type != Telephony.Sms.MESSAGE_TYPE_INBOX)
                    .put("transport", "SMS")
                    .put("state", type == Telephony.Sms.MESSAGE_TYPE_FAILED ? "failed" :
                        type == Telephony.Sms.MESSAGE_TYPE_OUTBOX || type == Telephony.Sms.MESSAGE_TYPE_QUEUED ? "sending" : "sent");
                if (older(message, before)) {
                    messages.add(message);
                    count++;
                }
            }
        }

        try (Cursor cursor = resolver.query(
            Telephony.Mms.CONTENT_URI,
            new String[]{"_id", "date", "msg_box", "sub", "m_type"},
            "thread_id = ? AND msg_box != 3 AND date <= ?",
            new String[]{String.valueOf(numericThreadId), String.valueOf(beforeAt / 1000)},
            "date DESC, _id DESC")) {
            if (cursor == null) throw new IOException("MMS history is unavailable.");
            int count = 0;
            while (cursor.moveToNext() && count < PAGE_SIZE + 1) {
                long id = number(cursor, "_id");
                long type = number(cursor, "m_type");
                if (type != 128 && type != 130 && type != 132) continue;
                JSONObject message = new JSONObject()
                    .put("id", "mms-" + id)
                    .put("sort", orderKey("mms", id))
                    .put("at", number(cursor, "date") * 1000)
                    .put("outgoing", number(cursor, "msg_box") != 1)
                    .put("transport", "MMS")
                    .put("state", type == 130 ? "waiting" : "sent");
                if (!older(message, before)) continue;
                message.put("text", mmsText(id, string(cursor, "sub")));
                message.put("attachments", mmsAttachments(id));
                messages.add(message);
                count++;
            }
        }

        messages.sort(MESSAGE_ORDER);
        boolean hasMore = messages.size() > PAGE_SIZE;
        if (hasMore) messages = new ArrayList<>(messages.subList(0, PAGE_SIZE));
        JSONObject next = messages.isEmpty() ? null : new JSONObject()
            .put("at", messages.get(messages.size() - 1).optLong("at"))
            .put("sort", messages.get(messages.size() - 1).optString("sort"));
        return new JSONObject()
            .put("thread", details(threadId))
            .put("messages", new JSONArray(messages))
            .put("hasMore", hasMore)
            .put("nextBefore", next == null ? JSONObject.NULL : next);
    }

    JSONObject send(JSONObject request) throws Exception {
        String requestId = request.optString("requestId");
        if (!requestId.matches("[A-Za-z0-9_-]{8,120}")) throw new IllegalArgumentException("Invalid send request.");
        SharedPreferences ledger = context.getSharedPreferences("lotkeys-sends", Context.MODE_PRIVATE);
        synchronized (SmsResultReceiver.class) {
            if (ledger.contains(requestId)) return sendStatus(requestId);
            JSONObject result;
            try {
                requireRead();
                if (!canSendMessages()) throw new SecurityException("Allow SMS sending in the LotKeys Android setup.");
                if (!"sms".equals(request.optString("transport"))) {
                    throw new IllegalArgumentException("This checkpoint sends plain SMS only.");
                }
                JSONObject thread = details(request.optString("threadId"));
                String address = compactAddress(thread.optString("address"));
                if (thread.optBoolean("group") || !thread.optBoolean("canReply") || !sendable(address)) {
                    throw new IllegalArgumentException("Use the phone's messaging app for this group or unsupported recipient.");
                }
                if (!address.equals(compactAddress(request.optString("address")))) {
                    throw new IllegalArgumentException("The phone recipient changed. Refresh the conversation before sending.");
                }
                String text = request.optString("text");
                if (text.trim().isEmpty() || text.length() > 16000) {
                    throw new IllegalArgumentException("Enter a message under 16,000 characters.");
                }
                int subscriptionId = SmsManager.getDefaultSmsSubscriptionId();
                if (!SubscriptionManager.isValidSubscriptionId(subscriptionId)) {
                    throw new IllegalArgumentException("Choose the default SMS SIM in Android Settings first.");
                }
                SmsManager manager = SmsManager.getSmsManagerForSubscriptionId(subscriptionId);
                ArrayList<String> parts = manager.divideMessage(text);
                if (parts.size() > 12) throw new IllegalArgumentException("This message exceeds the 12-part SMS safety limit.");
                JSONArray outcomes = new JSONArray();
                for (int i = 0; i < parts.size(); i++) outcomes.put(0);
                result = new JSONObject()
                    .put("requestId", requestId)
                    .put("phase", "sending")
                    .put("results", outcomes)
                    .put("createdAt", System.currentTimeMillis())
                    .put("updatedAt", System.currentTimeMillis());
                pruneLedger(ledger);
                if (ledger.getAll().size() > 3000) throw new IllegalStateException("The phone's send receipt journal needs attention.");
                if (!ledger.edit().putString(requestId, result.toString()).commit()) {
                    throw new IllegalStateException("The phone could not reserve this send request safely.");
                }
                ArrayList<PendingIntent> sent = new ArrayList<>();
                for (int i = 0; i < parts.size(); i++) {
                    Intent intent = new Intent(context, SmsResultReceiver.class)
                        .setData(Uri.parse("lotkeys://sms/sent/" + requestId + "/" + i))
                        .putExtra("requestId", requestId)
                        .putExtra("part", i);
                    sent.add(PendingIntent.getBroadcast(
                        context, requestId.hashCode() + i, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
                }
                try {
                    if (parts.size() == 1) {
                        manager.sendTextMessage(address, null, parts.get(0), sent.get(0), null);
                    } else {
                        manager.sendMultipartTextMessage(address, null, parts, sent, null);
                    }
                } catch (Exception error) {
                    result.put("phase", "failed")
                        .put("error", "The phone could not submit this SMS. Check the phone before retrying.")
                        .put("updatedAt", System.currentTimeMillis());
                    ledger.edit().putString(requestId, result.toString()).commit();
                }
            } catch (Exception error) {
                result = new JSONObject()
                    .put("requestId", requestId)
                    .put("phase", "failed")
                    .put("error", error.getMessage() == null ? "SMS was not submitted." : error.getMessage())
                    .put("createdAt", System.currentTimeMillis())
                    .put("updatedAt", System.currentTimeMillis());
                ledger.edit().putString(requestId, result.toString()).commit();
            }
            PhoneConnectorService.nudge();
            return publicReceipt(result);
        }
    }

    JSONObject sendStatus(String requestId) throws Exception {
        if (requestId == null || !requestId.matches("[A-Za-z0-9_-]{8,120}")) {
            throw new IllegalArgumentException("Invalid send receipt request.");
        }
        String raw = context.getSharedPreferences("lotkeys-sends", Context.MODE_PRIVATE).getString(requestId, "");
        if (raw.isEmpty()) throw new IOException("The phone no longer has this send receipt.");
        return publicReceipt(new JSONObject(raw));
    }

    JSONObject mediaHandoff(JSONObject request) throws Exception {
        String requestId = request.optString("requestId");
        if (!requestId.matches("[A-Za-z0-9_-]{8,120}")) throw new IllegalArgumentException("Invalid media handoff request.");
        SharedPreferences ledger = context.getSharedPreferences("lotkeys-media-handoffs", Context.MODE_PRIVATE);
        synchronized (PhoneStore.class) {
            String previous = ledger.getString(requestId, "");
            if (!previous.isEmpty()) return new JSONObject(previous);
            pruneLedger(ledger);
            requireRead();
            JSONObject thread = details(request.optString("threadId"));
            String address = compactAddress(thread.optString("address"));
            if (thread.optBoolean("group") || !thread.optBoolean("canReply") || !sendable(address)) {
                throw new IllegalArgumentException("Use the phone's messaging app directly for this group or unsupported recipient.");
            }
            if (!address.equals(compactAddress(request.optString("address")))) {
                throw new IllegalArgumentException("The phone recipient changed. Refresh the conversation before sharing media.");
            }
            JSONArray input = request.optJSONArray("files");
            if (input == null || input.length() < 1 || input.length() > 5) {
                throw new IllegalArgumentException("Choose between one and five media items.");
            }
            File folder = new File(context.getCacheDir(), "lotkeys-handoff/" + requestId);
            if (!folder.mkdirs() && !folder.isDirectory()) throw new IOException("The phone could not prepare temporary media.");
            ArrayList<Uri> uris = new ArrayList<>();
            String commonType = "";
            long total = 0;
            for (int index = 0; index < input.length(); index++) {
                JSONObject item = input.getJSONObject(index);
                String requestedName = item.optString("name", "LotKeys media " + (index + 1));
                String type = item.optString("type", "application/octet-stream");
                if (!allowedHandoff(requestedName, type)) {
                    throw new IllegalArgumentException("Choose a photo, voice memo, PDF, or standard office document.");
                }
                byte[] bytes;
                try { bytes = Base64.decode(item.optString("data"), Base64.DEFAULT); }
                catch (IllegalArgumentException error) { throw new IllegalArgumentException("An attachment was not encoded correctly."); }
                total += bytes.length;
                if (bytes.length < 1 || bytes.length > 8L * 1024 * 1024 || total > 12L * 1024 * 1024) {
                    throw new IllegalArgumentException("Keep each attachment under 8 MB and the handoff under 12 MB total.");
                }
                String name = safeName(requestedName);
                File output = new File(folder, index + "-" + name);
                try (FileOutputStream stream = new FileOutputStream(output)) { stream.write(bytes); }
                Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".files", output);
                uris.add(uri);
                commonType = index == 0 ? type : commonType.equals(type) ? commonType : "*/*";
            }
            String packageName = Telephony.Sms.getDefaultSmsPackage(context);
            Intent intent = new Intent(uris.size() == 1 ? Intent.ACTION_SEND : Intent.ACTION_SEND_MULTIPLE)
                .setType(commonType.isEmpty() ? "*/*" : commonType)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION)
                .putExtra("address", address)
                .putExtra("sms_body", request.optString("text"))
                .putExtra(Intent.EXTRA_TEXT, request.optString("text"));
            if (uris.size() == 1) intent.putExtra(Intent.EXTRA_STREAM, uris.get(0));
            else intent.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            if (packageName != null && !packageName.isEmpty()) intent.setPackage(packageName);
            JSONObject result = new JSONObject()
                .put("requestId", requestId)
                .put("phase", "handoff")
                .put("createdAt", System.currentTimeMillis())
                .put("updatedAt", System.currentTimeMillis())
                .put("detail", "Opened in the phone's messaging app for final review and Send.");
            if (!ledger.edit().putString(requestId, result.toString()).commit()) {
                throw new IllegalStateException("The phone could not reserve this media handoff safely.");
            }
            try { context.startActivity(intent); }
            catch (Exception error) {
                result.put("phase", "failed").put("error", "Open the phone's messaging app and attach the media there.");
                ledger.edit().putString(requestId, result.toString()).commit();
            }
            PhoneConnectorService.nudge();
            return result;
        }
    }

    JSONObject attachment(String partId) throws Exception {
        requireRead();
        if (partId == null || !partId.matches("mms-part-[0-9]{1,18}")) throw new IllegalArgumentException("Invalid MMS attachment.");
        long id = Long.parseLong(partId.substring(9));
        try (Cursor cursor = resolver.query(
            Uri.parse("content://mms/part/" + id), new String[]{"_id", "ct", "name", "fn"}, null, null, null)) {
            if (cursor == null || !cursor.moveToFirst()) throw new IOException("This MMS attachment is no longer on the phone.");
            String type = string(cursor, "ct");
            if ("text/plain".equals(type) || "application/smil".equals(type)) throw new IllegalArgumentException("That MMS part is not saveable media.");
            try (InputStream input = resolver.openInputStream(Uri.parse("content://mms/part/" + id))) {
                if (input == null) throw new IOException("Android could not open this MMS attachment.");
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) > 0) {
                    if (output.size() + read > 12 * 1024 * 1024) throw new IOException("This MMS attachment is larger than the 12 MB save limit.");
                    output.write(buffer, 0, read);
                }
                return new JSONObject()
                    .put("id", partId)
                    .put("name", partName(cursor, id, type))
                    .put("type", type.isEmpty() ? "application/octet-stream" : type)
                    .put("size", output.size())
                    .put("data", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
            }
        }
    }

    private static JSONObject publicReceipt(JSONObject row) throws Exception {
        return new JSONObject()
            .put("requestId", row.optString("requestId"))
            .put("phase", row.optString("phase", "sending"))
            .put("error", row.optString("error"))
            .put("updatedAt", row.optLong("updatedAt"));
    }

    private static void pruneLedger(SharedPreferences ledger) {
        SharedPreferences.Editor editor = ledger.edit();
        long cutoff = System.currentTimeMillis() - SEND_LEDGER_MAX_AGE;
        for (Map.Entry<String, ?> entry : ledger.getAll().entrySet()) {
            try {
                if (new JSONObject(String.valueOf(entry.getValue())).optLong("createdAt") < cutoff) {
                    editor.remove(entry.getKey());
                }
            } catch (Exception ignored) {
                editor.remove(entry.getKey());
            }
        }
        editor.apply();
    }

    private JSONObject thread(Cursor cursor) throws Exception {
        long id = number(cursor, "_id");
        String recipientIds = string(cursor, "recipient_ids").trim();
        boolean multi = !recipientIds.isEmpty() && recipientIds.split("\\s+").length > 1;
        List<String> people = addresses(recipientIds);
        if (people.isEmpty() && !multi) {
            try (Cursor sms = resolver.query(
                Telephony.Sms.CONTENT_URI, new String[]{"address"},
                "thread_id = ? AND type != 3", new String[]{String.valueOf(id)},
                "date DESC, _id DESC")) {
                if (sms != null && sms.moveToFirst() && !string(sms, "address").isEmpty()) {
                    people.add(string(sms, "address"));
                }
            }
        }
        String address = !multi && people.size() == 1 ? people.get(0) : "";
        String phoneName = address.isEmpty() ? "" : contactName(address);
        String title = !phoneName.isEmpty() ? phoneName : people.isEmpty() ? "Conversation " + id : String.join(", ", people);
        return new JSONObject()
            .put("id", "smsmms-" + id)
            .put("title", clip(title, 300))
            .put("phoneContactName", clip(phoneName, 300))
            .put("address", address)
            .put("participants", new JSONArray(people))
            .put("group", multi || people.size() > 1)
            .put("at", number(cursor, "date"))
            .put("preview", clip(string(cursor, "snippet"), 350))
            .put("unread", number(cursor, "read") == 0 ? 1 : 0)
            .put("count", number(cursor, "message_count"))
            .put("canReply", !multi && people.size() == 1 && sendable(address))
            .put("transport", "sms-mms");
    }

    private List<String> addresses(String ids) {
        List<String> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String id : ids.trim().split("\\s+")) {
            if (!id.matches("[0-9]+")) continue;
            try (Cursor cursor = resolver.query(
                Uri.parse("content://mms-sms/canonical-addresses"), new String[]{"address"},
                "_id = ?", new String[]{id}, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    String address = string(cursor, "address");
                    if (!address.isEmpty() && seen.add(address)) result.add(address);
                }
            } catch (RuntimeException ignored) {
                // Some OEMs restrict canonical-address lookups. The SMS fallback above handles one-to-one threads.
            }
        }
        return result;
    }

    private String contactName(String address) {
        if (!canReadContacts() || address == null || address.isEmpty()) return "";
        Uri lookup = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(address));
        try (Cursor cursor = resolver.query(
            lookup, new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME}, null, null, null)) {
            return cursor != null && cursor.moveToFirst()
                ? string(cursor, ContactsContract.PhoneLookup.DISPLAY_NAME) : "";
        } catch (RuntimeException ignored) {
            return "";
        }
    }

    private String mmsText(long messageId, String subject) throws Exception {
        StringBuilder text = new StringBuilder();
        int attachments = 0;
        try (Cursor parts = resolver.query(
            Uri.parse("content://mms/part"), new String[]{"_id", "ct", "text", "_data"},
            "mid = ?", new String[]{String.valueOf(messageId)}, "seq ASC")) {
            if (parts == null) throw new IOException("MMS parts could not be read.");
            while (parts.moveToNext()) {
                String contentType = string(parts, "ct");
                if ("text/plain".equals(contentType)) {
                    String value = string(parts, "text");
                    if (value.isEmpty() && !string(parts, "_data").isEmpty()) {
                        try (InputStream input = resolver.openInputStream(
                            Uri.parse("content://mms/part/" + number(parts, "_id")))) {
                            if (input != null) {
                                ByteArrayOutputStream output = new ByteArrayOutputStream();
                                byte[] buffer = new byte[2048];
                                int read;
                                while (output.size() < 16000 &&
                                    (read = input.read(buffer, 0, Math.min(buffer.length, 16000 - output.size()))) > 0) {
                                    output.write(buffer, 0, read);
                                }
                                value = new String(output.toByteArray(), StandardCharsets.UTF_8);
                            }
                        }
                    }
                    if (text.length() < 16000) {
                        if (text.length() > 0) text.append('\n');
                        text.append(clip(value, 16000 - text.length()));
                    }
                } else if (!"application/smil".equals(contentType)) {
                    attachments++;
                }
            }
        }
        if (!subject.isEmpty() && !"null".equals(subject)) text.insert(0, clip(subject, 300) + "\n");
        if (attachments > 0) text.append("\n[").append(attachments).append(" MMS attachment(s)]");
        return text.length() == 0 ? "[MMS]" : clip(text.toString(), 16000);
    }

    private JSONArray mmsAttachments(long messageId) throws Exception {
        JSONArray result = new JSONArray();
        try (Cursor parts = resolver.query(
            Uri.parse("content://mms/part"), new String[]{"_id", "ct", "name", "fn"},
            "mid = ?", new String[]{String.valueOf(messageId)}, "seq ASC")) {
            if (parts == null) throw new IOException("MMS parts could not be read.");
            while (parts.moveToNext()) {
                String type = string(parts, "ct");
                if ("text/plain".equals(type) || "application/smil".equals(type)) continue;
                long id = number(parts, "_id");
                result.put(new JSONObject()
                    .put("id", "mms-part-" + id)
                    .put("name", partName(parts, id, type))
                    .put("type", type.isEmpty() ? "application/octet-stream" : type));
            }
        }
        return result;
    }

    private static String partName(Cursor cursor, long id, String type) {
        String name = string(cursor, "name");
        if (name.isEmpty()) name = string(cursor, "fn");
        if (!name.isEmpty()) return safeName(name);
        String extension = "application/pdf".equals(type) ? "pdf" :
            type.startsWith("image/") ? type.substring(6) :
            type.startsWith("audio/") ? type.substring(6) :
            type.startsWith("video/") ? type.substring(6) : "bin";
        extension = extension.replaceAll("[^A-Za-z0-9]", "");
        return "MMS attachment " + id + "." + (extension.isEmpty() ? "bin" : extension);
    }

    private static String safeName(String value) {
        String name = value == null ? "LotKeys media" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (name.isEmpty()) name = "LotKeys media";
        return name.length() > 150 ? name.substring(0, 150) : name;
    }

    private static boolean allowedHandoff(String name, String type) {
        String lowerName = name == null ? "" : name.toLowerCase(Locale.ROOT);
        String lowerType = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if (lowerType.startsWith("image/") || lowerType.startsWith("audio/")) return true;
        return lowerName.matches(".*\\.(?:jpe?g|png|gif|webp|heic|heif|pdf|docx?|xlsx?|txt|csv|rtf|mp3|m4a|wav|ogg|webm)$");
    }

    static boolean sendable(String address) {
        return address != null && compactAddress(address).matches("\\+?[0-9]{7,15}");
    }

    static String compactAddress(String value) {
        return value == null ? "" : value.replaceAll("[ ()\\-.]", "");
    }

    static long threadNumber(String id) {
        if (id == null || !id.matches("smsmms-[0-9]{1,18}")) {
            throw new IllegalArgumentException("Invalid phone conversation ID.");
        }
        return Long.parseLong(id.substring(7));
    }

    private static String string(Cursor cursor, String column) {
        int index = cursor.getColumnIndex(column);
        return index < 0 || cursor.isNull(index) ? "" : cursor.getString(index);
    }

    private static long number(Cursor cursor, String column) {
        int index = cursor.getColumnIndex(column);
        return index < 0 || cursor.isNull(index) ? 0 : cursor.getLong(index);
    }

    private static String clip(String value, int length) {
        if (value == null) return "";
        return value.length() <= length ? value : value.substring(0, length) + "…";
    }

    private static String orderKey(String kind, long id) {
        return kind + String.format(Locale.ROOT, "%020d", id);
    }

    private static boolean older(JSONObject message, JSONObject before) {
        if (before == null) return true;
        long at = before.optLong("at", Long.MAX_VALUE);
        return message.optLong("at") < at ||
            (message.optLong("at") == at && message.optString("sort").compareTo(before.optString("sort")) < 0);
    }

    private static final Comparator<JSONObject> MESSAGE_ORDER = (left, right) -> {
        int time = Long.compare(right.optLong("at"), left.optLong("at"));
        return time != 0 ? time : right.optString("sort").compareTo(left.optString("sort"));
    };
}
