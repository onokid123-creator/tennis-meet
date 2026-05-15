package com.tennismeet.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

            NotificationChannel channel = new NotificationChannel(
                "tennismeet_high_priority",
                "Tennis Meet High Priority",
                NotificationManager.IMPORTANCE_HIGH
            );

            channel.setDescription("채팅, 신청, 식사 제안 등 중요한 알림");
            channel.enableLights(true);
            channel.enableVibration(true);

            manager.createNotificationChannel(channel);
        }
    }
}