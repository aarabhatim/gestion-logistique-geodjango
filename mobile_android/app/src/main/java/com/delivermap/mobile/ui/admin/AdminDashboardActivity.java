package com.delivermap.mobile.ui.admin;

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
import com.delivermap.mobile.adapters.ChauffeurAdapter;
import com.delivermap.mobile.adapters.ClientAdapter;
import com.delivermap.mobile.adapters.CommandeAdapter;
import com.delivermap.mobile.api.ApiClient;
import com.delivermap.mobile.api.ApiService;
import com.delivermap.mobile.models.Chauffeur;
import com.delivermap.mobile.models.Client;
import com.delivermap.mobile.models.Commande;
import com.delivermap.mobile.models.PagedResponse;
import com.delivermap.mobile.ui.auth.LoginActivity;
import com.delivermap.mobile.utils.TokenManager;
import com.google.android.material.navigation.NavigationView;
import com.google.android.material.tabs.TabLayout;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AdminDashboardActivity extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {

    private DrawerLayout drawerLayout;
    private TabLayout tabLayout;
    private RecyclerView recyclerView;
    private SwipeRefreshLayout swipeRefresh;
    private TextView tvEmptyState;

    private ApiService api;

    // Onglets
    private static final int TAB_COMMANDES  = 0;
    private static final int TAB_CLIENTS    = 1;
    private static final int TAB_CHAUFFEURS = 2;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_dashboard);

        api = ApiClient.getService(this);

        // Toolbar
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        // Drawer
        drawerLayout = findViewById(R.id.drawerLayout);
        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
            this, drawerLayout, toolbar,
            R.string.nav_open, R.string.nav_close);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        NavigationView navView = findViewById(R.id.navigationView);
        navView.setNavigationItemSelectedListener(this);

        // Nom de l'admin dans le drawer
        TextView tvAdminName = navView.getHeaderView(0).findViewById(R.id.tvAdminName);
        if (tvAdminName != null) {
            tvAdminName.setText(TokenManager.getUsername(this));
        }

        // RecyclerView
        recyclerView  = findViewById(R.id.recyclerView);
        swipeRefresh  = findViewById(R.id.swipeRefresh);
        tvEmptyState  = findViewById(R.id.tvEmptyState);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        // Tabs
        tabLayout = findViewById(R.id.tabLayout);
        tabLayout.addTab(tabLayout.newTab().setText("Commandes"));
        tabLayout.addTab(tabLayout.newTab().setText("Clients"));
        tabLayout.addTab(tabLayout.newTab().setText("Chauffeurs"));

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab tab) { loadTab(tab.getPosition()); }
            @Override public void onTabUnselected(TabLayout.Tab tab) {}
            @Override public void onTabReselected(TabLayout.Tab tab) { loadTab(tab.getPosition()); }
        });

        swipeRefresh.setOnRefreshListener(() -> loadTab(tabLayout.getSelectedTabPosition()));

        // Chargement initial
        loadTab(TAB_COMMANDES);
    }

    private void loadTab(int position) {
        swipeRefresh.setRefreshing(true);
        switch (position) {
            case TAB_COMMANDES:  loadCommandes();  break;
            case TAB_CLIENTS:    loadClients();    break;
            case TAB_CHAUFFEURS: loadChauffeurs(); break;
        }
    }

    // ─── Commandes ────────────────────────────────────────────────────────────

    private void loadCommandes() {
        api.getCommandes().enqueue(new Callback<PagedResponse<Commande>>() {
            @Override
            public void onResponse(Call<PagedResponse<Commande>> call, Response<PagedResponse<Commande>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    showCommandes(response.body().results);
                } else {
                    showError("Impossible de charger les commandes (code " + response.code() + ")");
                }
            }
            @Override
            public void onFailure(Call<PagedResponse<Commande>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                showError("Erreur réseau : " + t.getMessage());
            }
        });
    }

    private void showCommandes(List<Commande> commandes) {
        if (commandes.isEmpty()) {
            showEmpty("Aucune commande");
        } else {
            tvEmptyState.setVisibility(android.view.View.GONE);
            recyclerView.setAdapter(new CommandeAdapter(commandes));
        }
    }

    // ─── Clients ──────────────────────────────────────────────────────────────

    private void loadClients() {
        api.getClients("CLIENT").enqueue(new Callback<PagedResponse<Client>>() {
            @Override
            public void onResponse(Call<PagedResponse<Client>> call, Response<PagedResponse<Client>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    showClients(response.body().results);
                } else {
                    showError("Impossible de charger les clients (code " + response.code() + ")");
                }
            }
            @Override
            public void onFailure(Call<PagedResponse<Client>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                showError("Erreur réseau : " + t.getMessage());
            }
        });
    }

    private void showClients(List<Client> clients) {
        if (clients.isEmpty()) {
            showEmpty("Aucun client");
        } else {
            tvEmptyState.setVisibility(android.view.View.GONE);
            recyclerView.setAdapter(new ClientAdapter(clients));
        }
    }

    // ─── Chauffeurs ───────────────────────────────────────────────────────────

    private void loadChauffeurs() {
        api.getChauffeurs("TRANSPORTEUR").enqueue(new Callback<PagedResponse<Chauffeur>>() {
            @Override
            public void onResponse(Call<PagedResponse<Chauffeur>> call, Response<PagedResponse<Chauffeur>> response) {
                swipeRefresh.setRefreshing(false);
                if (response.isSuccessful() && response.body() != null) {
                    showChauffeurs(response.body().results);
                } else {
                    showError("Impossible de charger les chauffeurs (code " + response.code() + ")");
                }
            }
            @Override
            public void onFailure(Call<PagedResponse<Chauffeur>> call, Throwable t) {
                swipeRefresh.setRefreshing(false);
                showError("Erreur réseau : " + t.getMessage());
            }
        });
    }

    private void showChauffeurs(List<Chauffeur> chauffeurs) {
        if (chauffeurs.isEmpty()) {
            showEmpty("Aucun chauffeur");
        } else {
            tvEmptyState.setVisibility(android.view.View.GONE);
            recyclerView.setAdapter(new ChauffeurAdapter(chauffeurs));
        }
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

    // ─── Navigation Drawer ────────────────────────────────────────────────────

    @Override
    public boolean onNavigationItemSelected(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.nav_logout) {
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
