package com.delivermap.mobile.ui.client;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBarDrawerToggle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.delivermap.mobile.R;
import com.delivermap.mobile.adapters.BoutiqueAdapter;
import com.delivermap.mobile.adapters.CommandeAdapter;
import com.delivermap.mobile.api.ApiClient;
import com.delivermap.mobile.api.ApiService;
import com.delivermap.mobile.models.Boutique;
import com.delivermap.mobile.models.Commande;
import com.delivermap.mobile.models.PagedResponse;
import com.delivermap.mobile.ui.auth.LoginActivity;
import com.delivermap.mobile.utils.TokenManager;
import com.google.android.material.navigation.NavigationView;
import com.google.android.material.tabs.TabLayout;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ClientDashboardActivity extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {

    private DrawerLayout drawerLayout;
    private TabLayout tabLayout;
    private RecyclerView recyclerView;
    private SwipeRefreshLayout swipeRefresh;
    private TextView tvEmptyState;

    private ApiService api;

    private static final int TAB_BOUTIQUES = 0;
    private static final int TAB_COMMANDES = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_client_dashboard);

        api = ApiClient.getService(this);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        drawerLayout = findViewById(R.id.drawerLayout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
            this, drawerLayout, toolbar,
            R.string.nav_open, R.string.nav_close);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        NavigationView navView = findViewById(R.id.navigationView);
        navView.setNavigationItemSelectedListener(this);

        // Nom du client dans le header du drawer
        TextView tvClientName = navView.getHeaderView(0).findViewById(R.id.tvAdminName);
        if (tvClientName != null) {
            tvClientName.setText(TokenManager.getUsername(this));
        }

        recyclerView = findViewById(R.id.recyclerView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        tvEmptyState = findViewById(R.id.tvEmptyState);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        tabLayout = findViewById(R.id.tabLayout);
        tabLayout.addTab(tabLayout.newTab().setText("Boutiques"));
        tabLayout.addTab(tabLayout.newTab().setText("Mes commandes"));

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab tab) { loadTab(tab.getPosition()); }
            @Override public void onTabUnselected(TabLayout.Tab tab) {}
            @Override public void onTabReselected(TabLayout.Tab tab) { loadTab(tab.getPosition()); }
        });

        swipeRefresh.setOnRefreshListener(() -> loadTab(tabLayout.getSelectedTabPosition()));

        loadTab(TAB_BOUTIQUES);
    }

    private void loadTab(int position) {
        swipeRefresh.setRefreshing(true);
        if (position == TAB_BOUTIQUES) loadBoutiques();
        else loadMesCommandes();
    }

    // ─── Boutiques ────────────────────────────────────────────────────────────

    private void loadBoutiques() {
        api.getBoutiques().enqueue(new Callback<PagedResponse<Boutique>>() {
            @Override
            public void onResponse(Call<PagedResponse<Boutique>> call, Response<PagedResponse<Boutique>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    List<Boutique> list = response.body().results;
                    if (list == null || list.isEmpty()) {
                        showEmpty("Aucune boutique disponible");
                    } else {
                        tvEmptyState.setVisibility(android.view.View.GONE);
                        recyclerView.setAdapter(new BoutiqueAdapter(ClientDashboardActivity.this, list));
                    }
                } else {
                    showError("Impossible de charger les boutiques (code " + response.code() + ")");
                }
            }
            @Override
            public void onFailure(Call<PagedResponse<Boutique>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                showError("Erreur réseau : " + t.getMessage());
            }
        });
    }

    // ─── Mes commandes ────────────────────────────────────────────────────────

    private void loadMesCommandes() {
        api.getMesCommandes().enqueue(new Callback<PagedResponse<Commande>>() {
            @Override
            public void onResponse(Call<PagedResponse<Commande>> call, Response<PagedResponse<Commande>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    List<Commande> list = response.body().results;
                    if (list == null || list.isEmpty()) {
                        showEmpty("Vous n'avez pas encore de commandes");
                    } else {
                        tvEmptyState.setVisibility(android.view.View.GONE);
                        recyclerView.setAdapter(new CommandeAdapter(list));
                    }
                } else {
                    showError("Impossible de charger vos commandes (code " + response.code() + ")");
                }
            }
            @Override
            public void onFailure(Call<PagedResponse<Commande>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                showError("Erreur réseau : " + t.getMessage());
            }
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void showEmpty(String msg) {
        tvEmptyState.setText(msg);
        tvEmptyState.setVisibility(android.view.View.VISIBLE);
        recyclerView.setAdapter(null);
    }

    private void showError(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.nav_logout) {
            TokenManager.clear(this);
            ApiClient.reset();
            Intent intent = new Intent(this, LoginActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(intent);
        }
        drawerLayout.closeDrawer(GravityCompat.START);
        return true;
    }

    @Override
    public void onBackPressed() {
        if (drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }
}
