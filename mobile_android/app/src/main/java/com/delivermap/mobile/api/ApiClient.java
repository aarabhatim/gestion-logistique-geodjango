package com.delivermap.mobile.api;

import android.content.Context;

import com.delivermap.mobile.utils.TokenManager;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class ApiClient {

    // Changez cette URL selon votre configuration :
    // Emulateur Android → 10.0.2.2:8000
    // Appareil physique  → votre IP locale ex: 192.168.1.XX:8000
    public static final String BASE_URL = "http://10.0.2.2:8000/api/";

    private static Retrofit retrofit = null;

    public static ApiService getService(Context context) {
        if (retrofit == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

            OkHttpClient client = new OkHttpClient.Builder()
                .addInterceptor(chain -> {
                    String token = TokenManager.getAccessToken(context);
                    Request.Builder builder = chain.request().newBuilder();
                    if (token != null && !token.isEmpty()) {
                        builder.addHeader("Authorization", "Bearer " + token);
                    }
                    return chain.proceed(builder.build());
                })
                .addInterceptor(logging)
                .build();

            retrofit = new Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        }
        return retrofit.create(ApiService.class);
    }

    /** Réinitialise le client (ex: après logout) */
    public static void reset() {
        retrofit = null;
    }
}
