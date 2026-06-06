package com.delivermap.mobile.ui;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;

import androidx.appcompat.app.AppCompatActivity;

import com.delivermap.mobile.R;
import com.delivermap.mobile.ui.admin.AdminDashboardActivity;
import com.delivermap.mobile.ui.auth.LoginActivity;
import com.delivermap.mobile.ui.client.ClientDashboardActivity;
import com.delivermap.mobile.utils.TokenManager;

/**
 * Écran de démarrage : redirige automatiquement selon l'état de connexion et le rôle.
 */
public class SplashActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        new Handler().postDelayed(() -> {
            if (TokenManager.isLoggedIn(this)) {
                String role = TokenManager.getRole(this);
                if ("ADMIN".equals(role)) {
                    startActivity(new Intent(this, AdminDashboardActivity.class));
                } else {
                    // CLIENT (et autres rôles) → interface client
                    startActivity(new Intent(this, ClientDashboardActivity.class));
                }
            } else {
                startActivity(new Intent(this, LoginActivity.class));
            }
            finish();
        }, 1200);
    }
}
