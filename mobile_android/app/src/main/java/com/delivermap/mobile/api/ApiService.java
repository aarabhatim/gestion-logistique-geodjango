package com.delivermap.mobile.api;

import com.delivermap.mobile.models.Boutique;
import com.delivermap.mobile.models.Chauffeur;
import com.delivermap.mobile.models.Client;
import com.delivermap.mobile.models.Commande;
import com.delivermap.mobile.models.LoginRequest;
import com.delivermap.mobile.models.LoginResponse;
import com.delivermap.mobile.models.PagedResponse;
import com.delivermap.mobile.models.RegisterRequest;
import com.delivermap.mobile.models.User;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface ApiService {

    // ─── AUTH ────────────────────────────────────────────────────────────────

    @POST("auth/login/")
    Call<LoginResponse> login(@Body LoginRequest body);

    @POST("auth/register/")
    Call<LoginResponse> register(@Body RegisterRequest body);

    @GET("auth/me/")
    Call<User> me();

    // ─── ADMIN — Commandes ───────────────────────────────────────────────────

    /**
     * Liste toutes les commandes (réponse paginée).
     * page_size=100 pour récupérer d'un coup sans pagination côté app.
     */
    @GET("commandes/?page_size=100")
    Call<PagedResponse<Commande>> getCommandes();

    // ─── ADMIN — Utilisateurs ────────────────────────────────────────────────

    /** Liste des clients */
    @GET("auth/admin/users/")
    Call<PagedResponse<Client>> getClients(@Query("role") String role);

    /** Liste des chauffeurs */
    @GET("auth/admin/users/")
    Call<PagedResponse<Chauffeur>> getChauffeurs(@Query("role") String role);

    // ─── CLIENT ──────────────────────────────────────────────────────────────

    /**
     * Liste des boutiques.
     * Le backend filtre automatiquement par rôle dans le queryset.
     */
    @GET("fondateurs/?page_size=100")
    Call<PagedResponse<Boutique>> getBoutiques();

    /**
     * Commandes du client connecté.
     * L'endpoint commandes/ filtre par client si role=CLIENT.
     */
    @GET("commandes/?page_size=100")
    Call<PagedResponse<Commande>> getMesCommandes();
}
