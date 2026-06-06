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
import com.delivermap.mobile.models.LoginResponse;
import com.delivermap.mobile.models.RegisterRequest;
import com.delivermap.mobile.ui.client.ClientDashboardActivity;
import com.delivermap.mobile.utils.TokenManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private EditText etFirstName, etLastName, etUsername, etEmail, etPhone, etPassword, etConfirmPassword;
    private Button btnRegister;
    private ProgressBar progressBar;
    private TextView tvGoLogin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        etFirstName       = findViewById(R.id.etFirstName);
        etLastName        = findViewById(R.id.etLastName);
        etUsername        = findViewById(R.id.etUsername);
        etEmail           = findViewById(R.id.etEmail);
        etPhone           = findViewById(R.id.etPhone);
        etPassword        = findViewById(R.id.etPassword);
        etConfirmPassword = findViewById(R.id.etConfirmPassword);
        btnRegister       = findViewById(R.id.btnRegister);
        progressBar       = findViewById(R.id.progressBar);
        tvGoLogin         = findViewById(R.id.tvGoLogin);

        btnRegister.setOnClickListener(v -> attemptRegister());
        tvGoLogin.setOnClickListener(v -> finish());
    }

    private void attemptRegister() {
        String firstName = etFirstName.getText().toString().trim();
        String lastName  = etLastName.getText().toString().trim();
        String username  = etUsername.getText().toString().trim();
        String email     = etEmail.getText().toString().trim();
        String phone     = etPhone.getText().toString().trim();
        String password  = etPassword.getText().toString().trim();
        String confirm   = etConfirmPassword.getText().toString().trim();

        if (firstName.isEmpty() || username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Remplissez tous les champs obligatoires", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!password.equals(confirm)) {
            Toast.makeText(this, "Les mots de passe ne correspondent pas", Toast.LENGTH_SHORT).show();
            return;
        }
        if (password.length() < 8) {
            Toast.makeText(this, "Mot de passe trop court (min. 8 caractères)", Toast.LENGTH_SHORT).show();
            return;
        }

        setLoading(true);

        RegisterRequest req = new RegisterRequest(username, email, password, firstName, lastName, phone);

        ApiClient.getService(this).register(req).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                setLoading(false);
                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse body = response.body();
                    TokenManager.saveTokens(RegisterActivity.this, body.access, body.refresh);
                    String role = (body.user != null) ? body.user.role : "CLIENT";
                    String uname = (body.user != null) ? body.user.username : username;
                    TokenManager.saveUserInfo(RegisterActivity.this, role, uname);

                    Toast.makeText(RegisterActivity.this,
                        "Compte créé avec succès !", Toast.LENGTH_SHORT).show();

                    Intent intent = new Intent(RegisterActivity.this, ClientDashboardActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                } else {
                    String msg = "Erreur d'inscription";
                    if (response.code() == 400) msg = "Ce nom d'utilisateur ou email est déjà utilisé";
                    Toast.makeText(RegisterActivity.this, msg, Toast.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                setLoading(false);
                Toast.makeText(RegisterActivity.this,
                    "Erreur réseau : " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
        btnRegister.setEnabled(!loading);
    }
}
