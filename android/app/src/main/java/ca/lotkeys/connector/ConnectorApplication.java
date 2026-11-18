package ca.lotkeys.connector;

public final class ConnectorApplication extends android.app.Application {
    @Override public void onCreate() { super.onCreate(); WakeDoorbell.initialize(this); }
}
