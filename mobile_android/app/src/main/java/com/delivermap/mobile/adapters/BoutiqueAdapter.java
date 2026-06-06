package com.delivermap.mobile.adapters;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.delivermap.mobile.R;
import com.delivermap.mobile.api.ApiClient;
import com.delivermap.mobile.models.Boutique;

import java.util.List;

public class BoutiqueAdapter extends RecyclerView.Adapter<BoutiqueAdapter.VH> {

    private final Context context;
    private final List<Boutique> items;

    public BoutiqueAdapter(Context context, List<Boutique> items) {
        this.context = context;
        this.items   = items;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_boutique, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Boutique b = items.get(position);

        h.tvNom.setText(b.nomBoutique);
        h.tvCategorie.setText(b.getCategorieLabel());
        h.tvVille.setText(b.ville != null ? b.ville : "");
        h.tvNote.setText(String.format("★ %.1f (%d avis)", b.noteMoyenne, b.nombreAvis));
        h.tvFrais.setText(String.format("Livraison : %.0f MAD", b.fraisLivraison));
        h.tvStatut.setText(b.isOpen ? "Ouvert" : "Fermé");
        h.tvStatut.setBackgroundColor(b.isOpen
            ? Color.parseColor("#2E7D32")
            : Color.parseColor("#C62828"));

        // Logo via Glide
        if (b.logo != null && !b.logo.isEmpty()) {
            String url = b.logo.startsWith("http") ? b.logo
                : ApiClient.BASE_URL.replace("/api/", "") + b.logo;
            Glide.with(context).load(url).placeholder(R.drawable.ic_store).into(h.ivLogo);
        } else {
            h.ivLogo.setImageResource(R.drawable.ic_store);
        }
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        ImageView ivLogo;
        TextView tvNom, tvCategorie, tvVille, tvNote, tvFrais, tvStatut;

        VH(View v) {
            super(v);
            ivLogo      = v.findViewById(R.id.ivLogo);
            tvNom       = v.findViewById(R.id.tvNom);
            tvCategorie = v.findViewById(R.id.tvCategorie);
            tvVille     = v.findViewById(R.id.tvVille);
            tvNote      = v.findViewById(R.id.tvNote);
            tvFrais     = v.findViewById(R.id.tvFrais);
            tvStatut    = v.findViewById(R.id.tvStatut);
        }
    }
}
