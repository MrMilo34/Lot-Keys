package ca.lotkeys.connector;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A token-protected, loopback-only bridge between the LotKeys web UI and Android APIs. */
final class LocalApiServer {
    static final int PORT = 39483;
    // Loopback-only, bearer-protected media handoffs are capped again inside PhoneStore.
    private static final int MAX_BODY = 18 * 1024 * 1024;
    private final PhoneConnectorService service;
    private final PhoneStore store;
    private final ExecutorService clients = Executors.newFixedThreadPool(4);
    private volatile boolean running;
    private ServerSocket server;
    private Thread acceptThread;

    LocalApiServer(PhoneConnectorService service) {
        this.service = service;
        this.store = new PhoneStore(service);
    }

    synchronized void start() throws Exception {
        if (running) return;
        server = new ServerSocket();
        server.setReuseAddress(true);
        server.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT), 12);
        running = true;
        acceptThread = new Thread(this::acceptLoop, "LotKeys-local-api");
        acceptThread.start();
    }

    synchronized void stop() {
        running = false;
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        if (acceptThread != null) acceptThread.interrupt();
        clients.shutdownNow();
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket socket = server.accept();
                socket.setSoTimeout(15000);
                clients.execute(() -> handle(socket));
            } catch (Exception error) {
                if (running) service.reportLocalError("Phone connection needs to restart.");
            }
        }
    }

    private void handle(Socket socket) {
        String origin = "";
        try (Socket connected = socket;
             InputStream input = connected.getInputStream();
             OutputStream output = connected.getOutputStream()) {
            try {
                String start = readLine(input);
                if (start == null || start.length() > 4096) return;
                String[] first = start.split(" ", 3);
                if (first.length < 2) return;
                String method = first[0].toUpperCase(Locale.ROOT);
                String target = first[1];
                Map<String, String> headers = new HashMap<>();
                String line;
                while ((line = readLine(input)) != null && !line.isEmpty()) {
                    int split = line.indexOf(':');
                    if (split > 0) headers.put(line.substring(0, split).trim().toLowerCase(Locale.ROOT), line.substring(split + 1).trim());
                }
                origin = headers.getOrDefault("origin", "");
                if (!allowedOrigin(origin)) {
                    send(output, 403, origin, error("This website is not allowed to use the LotKeys phone connector."));
                    return;
                }
                if ("OPTIONS".equals(method)) {
                    send(output, 204, origin, null);
                    return;
                }
                String expected = "Bearer " + InstallIdentity.token(service);
                if (!constantTime(expected, headers.getOrDefault("authorization", ""))) {
                    send(output, 401, origin, error("Open LotKeys from the Android setup to link this browser."));
                    return;
                }
                int length;
                try { length = Integer.parseInt(headers.getOrDefault("content-length", "0")); }
                catch (NumberFormatException error) { length = -1; }
                if (length < 0 || length > MAX_BODY) {
                    send(output, 413, origin, error("Request is too large."));
                    return;
                }
                byte[] bytes = readBody(input, length);
                JSONObject body = length == 0 ? new JSONObject() : new JSONObject(new String(bytes, StandardCharsets.UTF_8));
                send(output, 200, origin, route(method, target, body));
            } catch (SecurityException error) {
                send(output, 403, origin, error(error.getMessage()));
            } catch (IllegalArgumentException error) {
                send(output, 400, origin, error(error.getMessage()));
            } catch (Exception error) {
                send(output, 500, origin, error("The phone could not complete that request."));
            }
        } catch (Exception ignored) {
            // The browser closed the loopback connection before a response could be returned.
        }
    }

    private JSONObject route(String method, String target, JSONObject body) throws Exception {
        String path = target;
        int queryAt = target.indexOf('?');
        if (queryAt >= 0) path = target.substring(0, queryAt);
        Map<String, String> query = queryAt < 0 ? new HashMap<>() : query(target.substring(queryAt + 1));
        if ("GET".equals(method) && "/v1/status".equals(path)) {
            if (query.containsKey("foreground")) service.browserVisible("1".equals(query.get("foreground")));
            JSONObject status = store.status(PhoneConnectorService.revision(), PORT);
            JSONObject relay = service.relayStatus();
            status.put("relay", relay);
            status.getJSONObject("capabilities").put("backgroundRelay", relay.optBoolean("authorized"));
            status.getJSONObject("capabilities").put("backgroundUploads", TransferAuth.ready(service));
            status.getJSONObject("capabilities").put("uploadControls", true);
            status.getJSONObject("capabilities").put("deferredVehicleFinalization", TransferAuth.ready(service));
            status.getJSONObject("capabilities").put("adaptiveRelayPolling", true);
            status.put("uploadAccount", TransferAuth.account(service));
            return status;
        }
        if ("POST".equals(method) && "/v1/presence".equals(path)) {
            service.browserVisible(body.optBoolean("foreground"));
            return new JSONObject().put("ok", true);
        }
        if ("POST".equals(method) && path.startsWith("/v1/transfers/")) {
            TransferStore transfers = new TransferStore(service);
            if ("/v1/transfers/prepare".equals(path)) {
                String account = body.getJSONObject("context").getString("account");
                if (!TransferAuth.ready(service) || !account.equalsIgnoreCase(TransferAuth.account(service))) throw new SecurityException("Approve background uploads for this Google account in Android setup first.");
                return transfers.prepare(body);
            }
            if ("/v1/transfers/hold".equals(path)) { transfers.hold(body.getString("account"), body.getString("store")); return new JSONObject().put("ok", true); }
            String id = body.optString("id");
            if ("/v1/transfers/chunk".equals(path)) return transfers.append(id, body.getInt("item"), body.getLong("offset"), body.getString("base64"));
            if ("/v1/transfers/commit".equals(path)) {
                JSONObject batch = transfers.commit(id);
                if (!TransferStore.terminal(batch.optString("state")) && !TransferJobService.schedule(service, false)) throw new IllegalStateException("Android could not schedule this save. Open Android setup and tap Resume Drive Saves.");
                return batch.put("execution", TransferJobService.executionMode(service));
            }
            if ("/v1/transfers/status".equals(path)) return transfers.snapshot(transfers.get(id)).put("execution", TransferJobService.executionMode(service));
            if ("/v1/transfers/cancel".equals(path)) return transfers.cancel(id);
            if ("/v1/transfers/acknowledge".equals(path)) return transfers.acknowledge(id);
        }
        if ("GET".equals(method) && "/v1/threads".equals(path)) {
            return store.conversations(integer(query.get("offset"), 0));
        }
        if ("GET".equals(method) && "/v1/history".equals(path)) {
            JSONObject before = null;
            long beforeAt = longNumber(query.get("beforeAt"), 0);
            String beforeSort = query.getOrDefault("beforeSort", "");
            if (beforeAt > 0 && !beforeSort.isEmpty()) before = new JSONObject().put("at", beforeAt).put("sort", beforeSort);
            return store.history(query.getOrDefault("threadId", ""), before);
        }
        if ("POST".equals(method) && "/v1/send".equals(path)) return store.send(body);
        if ("POST".equals(method) && "/v1/media-handoff".equals(path)) return store.mediaHandoff(body);
        if ("GET".equals(method) && "/v1/attachment".equals(path)) {
            return store.attachment(query.getOrDefault("partId", ""));
        }
        if ("GET".equals(method) && "/v1/send-status".equals(path)) {
            return store.sendStatus(query.getOrDefault("requestId", ""));
        }
        if ("GET".equals(method) && "/v1/pairings".equals(path)) {
            return new JSONObject().put("pairings", service.pendingPairings());
        }
        if ("POST".equals(method) && "/v1/pairings/approve".equals(path)) {
            service.approvePair(body.optString("sessionId"), body.optString("trustMode", "36h"));
            return new JSONObject().put("queued", true);
        }
        if ("POST".equals(method) && "/v1/pairings/reject".equals(path)) {
            service.rejectPair(body.optString("sessionId"));
            return new JSONObject().put("queued", true);
        }
        if ("POST".equals(method) && "/v1/relay/disconnect".equals(path)) {
            service.disconnectRelay(body.optBoolean("forget"));
            return new JSONObject().put("queued", true);
        }
        if ("POST".equals(method) && "/v1/relay/disconnect-all".equals(path)) {
            service.disconnectAllRelays();
            return new JSONObject().put("queued", true);
        }
        if ("POST".equals(method) && "/v1/relay/forget".equals(path)) {
            service.forgetComputer(body.optString("browserId"));
            return new JSONObject().put("queued", true);
        }
        throw new IllegalArgumentException("Unknown LotKeys phone request.");
    }

    private static Map<String, String> query(String raw) throws Exception {
        Map<String, String> result = new HashMap<>();
        for (String pair : raw.split("&")) {
            if (pair.isEmpty()) continue;
            int split = pair.indexOf('=');
            String key = split < 0 ? pair : pair.substring(0, split);
            String value = split < 0 ? "" : pair.substring(split + 1);
            result.put(URLDecoder.decode(key, "UTF-8"), URLDecoder.decode(value, "UTF-8"));
        }
        return result;
    }

    private static byte[] readBody(InputStream input, int length) throws Exception {
        byte[] body = new byte[length];
        int offset = 0;
        while (offset < length) {
            int read = input.read(body, offset, length - offset);
            if (read < 0) throw new IllegalArgumentException("Incomplete request body.");
            offset += read;
        }
        return body;
    }

    private static int integer(String value, int fallback) {
        try { return Integer.parseInt(value); } catch (Exception ignored) { return fallback; }
    }

    private static long longNumber(String value, long fallback) {
        try { return Long.parseLong(value); } catch (Exception ignored) { return fallback; }
    }

    private static String readLine(InputStream input) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        int previous = -1;
        while (output.size() <= 8192) {
            int next = input.read();
            if (next < 0) return output.size() == 0 ? null : new String(output.toByteArray(), StandardCharsets.US_ASCII);
            if (previous == '\r' && next == '\n') {
                byte[] bytes = output.toByteArray();
                int length = Math.max(0, bytes.length - 1);
                return new String(bytes, 0, length, StandardCharsets.US_ASCII);
            }
            output.write(next);
            previous = next;
        }
        throw new IllegalArgumentException("Request headers are too large.");
    }

    private static boolean allowedOrigin(String origin) {
        if ("https://mrmilo34.github.io".equals(origin) || "https://lot-keys.ca".equals(origin) ||
            "https://www.lot-keys.ca".equals(origin)) return true;
        return origin.matches("http://(?:localhost|127\\.0\\.0\\.1)(?::[0-9]{1,5})?");
    }

    private static boolean constantTime(String left, String right) {
        byte[] a = left.getBytes(StandardCharsets.UTF_8);
        byte[] b = right.getBytes(StandardCharsets.UTF_8);
        if (a.length == 0 || b.length == 0) return a.length == b.length;
        int difference = a.length ^ b.length;
        int size = Math.max(a.length, b.length);
        for (int i = 0; i < size; i++) difference |= a[i % a.length] ^ b[i % b.length];
        return difference == 0;
    }

    private static JSONObject error(String message) {
        try { return new JSONObject().put("error", message); }
        catch (Exception ignored) { return new JSONObject(); }
    }

    private static void send(OutputStream output, int status, String origin, JSONObject payload) throws Exception {
        byte[] body = payload == null ? new byte[0] : payload.toString().getBytes(StandardCharsets.UTF_8);
        String reason = status == 200 ? "OK" : status == 204 ? "No Content" : status == 400 ? "Bad Request" :
            status == 401 ? "Unauthorized" : status == 403 ? "Forbidden" : status == 413 ? "Payload Too Large" : "Internal Server Error";
        StringBuilder headers = new StringBuilder("HTTP/1.1 ").append(status).append(' ').append(reason).append("\r\n")
            .append("Content-Type: application/json; charset=utf-8\r\n")
            .append("Content-Length: ").append(body.length).append("\r\n")
            .append("Cache-Control: no-store\r\n")
            .append("X-Content-Type-Options: nosniff\r\n")
            .append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n")
            .append("Access-Control-Allow-Headers: Authorization, Content-Type\r\n")
            .append("Access-Control-Allow-Private-Network: true\r\n")
            .append("Connection: close\r\n");
        if (allowedOrigin(origin)) headers.append("Access-Control-Allow-Origin: ").append(origin).append("\r\nVary: Origin\r\n");
        headers.append("\r\n");
        output.write(headers.toString().getBytes(StandardCharsets.US_ASCII));
        output.write(body);
        output.flush();
    }

}
