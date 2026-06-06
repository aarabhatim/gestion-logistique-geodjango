package com.delivermap.mobile.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.delivermap.mobile.R;
import com.delivermap.mobile.api.ApiClient;
import com.delivermap.mobile.api.ApiService;
import com.delivermap.mobile.models.LoginRequest;
import com.delivermap.mobile.models.LoginResponse;
import com.delivermap.mobile.ui.admin.AdminDashboardActivity;
import com.delivermap.mobile.ui.client.ClientDashboardActivity;
import com.delivermap.mobile.utils.TokenManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {

    private EditText etUsername, etPassword;
    private Button btnLogin;
    private ProgressBar progressBar;
    private TextView tvGoRegister;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        etUsername   = findViewById(R.id.etUsername);
        etPassword   = findViewById(R.id.etPassword);
        btnLogin     = findViewById(R.id.btnLogin);
        progressBar  = findViewById(R.id.progressBar);
        tvGoRegister = findViewById(R.id.tvGoRegister);

        btnLogin.setOnClickListener(v -> attemptLogin());

        tvGoRegister.setOnClickListener(v ->
            startActivity(new Intent(this, RegisterActivity.class))
        );
    }

    private void attemptLogin() {
        String username = etUsername.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (username.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Remplissez tous les champs", Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);

        ApiService api = ApiClient.getService(this);
        api.login(new LoginRequest(username, password)).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse body = response.body();
                    TokenManager.saveTokens(LoginActivity.this, body.access, body.refresh);
                    if (body.user != null) {
                        String effectiveRole = body.user.getEffectiveRole();
                        TokenManager.saveUserInfo(LoginActivity.this, effectiveRole, body.user.username);
                        redirectByRole(effectiveRole);
                    } else {
                        // fallback : récupérer /me/
                        fetchMeAndRedirect();
                    }
                } else {
                    Toast.makeText(LoginActivity.this,
                        "Identifiants incorrects", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                setLoading(false);
                Toast.makeText(LoginActivity.this,
                    "Erreur réseau : " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void fetchMeAndRedirect() {
        ApiClient.getService(this).me().enqueue(new Callback<com.delivermap.mobile.models.User>() {
            @Override
            public void onResponse(Call<com.delivermap.mobile.models.User> call,
                                   Response<com.delivermap.mobile.models.User> response) {
                if (response.isSuccessful() && response.body() != null) {
                    String role = response.body().getEffectiveRole();
                    TokenManager.saveUserInfo(LoginActivity.this, role, response.body().username);
                    redirectByRole(role);
                } else {
                    redirectByRole("CLIENT");
                }
            }

            @Override
            public void onFailure(Call<com.delivermap.mobile.models.User> call, Throwable t) {
                redirectByRole("CLIENT");
            }
        });
    }

    private void redirectByRole(String role) {
        Intent intent;
        if ("ADMIN".equals(role)) {
            intent = new Intent(this, AdminDashboardActivity.class);
        } else {
            intent = new Intent(this, ClientDashboardActivity.class);
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnLogin.setEnabled(!loading);
    }
}
